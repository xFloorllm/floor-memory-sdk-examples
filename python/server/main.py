import json
import os
from contextlib import contextmanager
from typing import Any, Dict, List, Mapping, Optional, Tuple, Union

from fastapi import FastAPI, File, Form, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import urllib3

import xfloor_memory_sdk
from xfloor_memory_sdk.exceptions import ApiException


XFLOOR_API_BASE_URL = os.getenv("XFLOOR_API_BASE_URL", "https://appfloor.in")
XFLOOR_VERIFY_SSL = os.getenv("XFLOOR_VERIFY_SSL", "true").strip().lower() not in {
    "0",
    "false",
    "no",
    "off",
}
XFLOOR_SSL_CA_CERT = (
    os.getenv("XFLOOR_SSL_CA_CERT") or os.getenv("SSL_CERT_FILE") or None
)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="xFloor Python SDK Server", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Authorization", "authorization"],
)


class QueryPayload(BaseModel):
    user_id: str
    query: str
    floor_ids: List[str]
    include_metadata: Optional[str] = "1"
    summary_needed: Optional[str] = "1"
    app_id: str
    filters: Optional[Dict[str, Any]] = None


class SignUpPayload(BaseModel):
    name: str
    password: str
    email_id: Optional[str] = None
    mobile_number: Optional[str] = None
    app_id: Optional[str] = None


class SignInEmailPayload(BaseModel):
    email_id: str
    pass_code: str
    login_type: str
    app_id: Optional[str] = None


class SignInMobilePayload(BaseModel):
    mobile_number: str
    pass_code: str
    login_type: str
    app_id: Optional[str] = None


class SendValidationCodePayload(BaseModel):
    mode: str
    user_id: Optional[str] = None
    email_id: Optional[str] = None
    mobile_number: Optional[str] = None


def _extract_access_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    value = authorization.strip()
    if not value:
        return None

    if value.lower().startswith("bearer "):
        token = value.split(" ", 1)[1].strip()
        return token or None

    return value


@contextmanager
def _sdk_client(access_token: Optional[str]):
    configuration = xfloor_memory_sdk.Configuration(host=XFLOOR_API_BASE_URL)
    configuration.verify_ssl = XFLOOR_VERIFY_SSL
    if XFLOOR_SSL_CA_CERT:
        configuration.ssl_ca_cert = XFLOOR_SSL_CA_CERT

    if access_token:
        configuration.access_token = access_token

    with xfloor_memory_sdk.ApiClient(configuration) as client:
        yield client


def _to_plain(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore")

    if isinstance(value, Mapping):
        return {k: _to_plain(v) for k, v in value.items()}

    if isinstance(value, tuple):
        return [_to_plain(v) for v in value]

    if isinstance(value, list):
        return [_to_plain(v) for v in value]

    if hasattr(value, "to_dict"):
        return _to_plain(value.to_dict())

    if hasattr(value, "model_dump"):
        return _to_plain(value.model_dump(by_alias=True, exclude_none=True))

    return str(value)


def _extract_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict) and isinstance(error.get("message"), str) and error.get("message"):
            return error["message"]

        if isinstance(payload.get("message"), str) and payload.get("message"):
            return payload["message"]

        if isinstance(payload.get("detail"), str) and payload.get("detail"):
            return payload["detail"]

    return fallback


def _sdk_exception_response(exc: ApiException) -> JSONResponse:
    status = int(exc.status) if exc.status else 502

    parsed_body: Any = None
    if exc.body:
        try:
            parsed_body = json.loads(exc.body)
        except json.JSONDecodeError:
            parsed_body = None

    fallback = str(exc.reason or "xFloor SDK request failed")
    message = _extract_message(parsed_body, fallback)

    if isinstance(parsed_body, dict) and "error" in parsed_body:
        content = parsed_body
    elif isinstance(parsed_body, dict):
        content = {"error": {"message": message, "details": parsed_body}}
    elif isinstance(parsed_body, list):
        content = {"error": {"message": message, "details": parsed_body}}
    else:
        content = {"error": {"message": message}}
        if exc.body:
            content["error"]["details"] = exc.body

    return JSONResponse(status_code=status, content=content)


def _unexpected_exception_response(exc: Exception) -> JSONResponse:
    message = str(exc) if str(exc) else exc.__class__.__name__

    if (
        isinstance(exc, urllib3.exceptions.MaxRetryError)
        or "CERTIFICATE_VERIFY_FAILED" in message
        or "certificate verify failed" in message.lower()
    ):
        return JSONResponse(
            status_code=502,
            content={
                "error": {
                    "message": (
                        "TLS certificate verification failed while connecting to xFloor API. "
                        "Fix local trust store (recommended) or set XFLOOR_SSL_CA_CERT."
                    ),
                    "details": message,
                }
            },
        )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "Unexpected server error.",
                "details": message,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_, exc: Exception):
    return _unexpected_exception_response(exc)


def _extract_auth_header(headers: Optional[Mapping[str, str]]) -> Optional[str]:
    if not headers:
        return None

    for key, value in headers.items():
        if key.lower() == "authorization" and value:
            return value

    return None


def _success_response_with_auth(data: Any, status_code: int, auth_header: Optional[str]) -> JSONResponse:
    headers: Dict[str, str] = {}
    if auth_header:
        headers["Authorization"] = auth_header

    return JSONResponse(status_code=status_code, content=_to_plain(data), headers=headers)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/memory/query")
def query(
    payload: QueryPayload,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.QueryApi(api_client)
            query_request = xfloor_memory_sdk.QueryRequest.from_dict(
                payload.model_dump(exclude_none=True)
            )
            response = api.query(query_request)
            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.post("/memory/events")
async def create_event(
    input_info: str = Form(...),
    app_id: str = Form(...),
    files: Optional[List[UploadFile]] = File(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.EventApi(api_client)

            prepared_files: List[Tuple[str, bytes]] = []
            if files:
                for uploaded_file in files:
                    if not uploaded_file.filename:
                        continue
                    prepared_files.append((uploaded_file.filename, await uploaded_file.read()))

            if not prepared_files:
                response = api.event(input_info=input_info, app_id=app_id)
            elif len(prepared_files) == 1:
                response = api.event(
                    input_info=input_info,
                    app_id=app_id,
                    files=prepared_files[0],
                )
            else:
                # SDK type hints only accept a single file, but the serializer supports lists.
                serialized = api._event_serialize(
                    input_info=input_info,
                    app_id=app_id,
                    files=prepared_files,
                    _request_auth=None,
                    _content_type=None,
                    _headers=None,
                    _host_index=0,
                )
                raw_response = api_client.call_api(*serialized)
                raw_response.read()
                response = api_client.response_deserialize(
                    response_data=raw_response,
                    response_types_map={
                        "200": "EventResponse",
                        "400": "Event400Response",
                    },
                ).data

            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.get("/memory/recent-events")
def get_recent_events(
    floor_id: str,
    app_id: str,
    user_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.GetRecentEventsApi(api_client)
            response = api.get_recent_events(floor_id=floor_id, app_id=app_id, user_id=user_id)
            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.get("/memory/floors/{floor_id}")
def get_floor_information(
    floor_id: str,
    app_id: str,
    user_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.GetFloorInformationApi(api_client)
            response = api.get_floor_information(
                floor_id=floor_id,
                app_id=app_id,
                user_id=user_id,
            )
            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.post("/memory/floors/{floor_id}/edit")
async def edit_floor(
    floor_id: str,
    user_id: str = Form(...),
    app_id: str = Form(...),
    title: Optional[str] = Form(default=None),
    details: Optional[str] = Form(default=None),
    logo_file: Optional[UploadFile] = File(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.EditFloorApi(api_client)

            logo_payload: Optional[Tuple[str, bytes]] = None
            if logo_file and logo_file.filename:
                logo_payload = (logo_file.filename, await logo_file.read())

            response = api.edit_floor(
                floor_id=floor_id,
                user_id=user_id,
                app_id=app_id,
                title=title,
                details=details,
                logo_file=logo_payload,
            )
            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.get("/memory/conversations")
def get_conversations(
    user_id: Optional[str] = None,
    thread_id: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.DefaultApi(api_client)
            response = api.get_conversations(user_id=user_id, thread_id=thread_id)
            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.get("/memory/threads")
def get_threads(
    user_id: str,
    floor_id: str,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.DefaultApi(api_client)
            response = api.conversation_threads(user_id=user_id, floor_id=floor_id)
            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.post("/memory/auth/sign-up")
def sign_up(
    payload: SignUpPayload,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.DefaultApi(api_client)
            response = api.sign_up_with_http_info(
                name=payload.name,
                password=payload.password,
                email_id=payload.email_id,
                mobile_number=payload.mobile_number,
                app_id=payload.app_id,
            )
            auth_header = _extract_auth_header(response.headers)
            data = _to_plain(response.data)
            if auth_header and isinstance(data, dict):
                data.setdefault("token", auth_header.replace("Bearer ", ""))
            return _success_response_with_auth(data, response.status_code, auth_header)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.post("/memory/auth/sign-in/email")
def sign_in_with_email(
    payload: SignInEmailPayload,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.DefaultApi(api_client)
            response = api.sign_in_with_email_with_http_info(
                email_id=payload.email_id,
                pass_code=payload.pass_code,
                login_type=payload.login_type,
                app_id=payload.app_id,
            )
            auth_header = _extract_auth_header(response.headers)
            data = _to_plain(response.data)
            if auth_header and isinstance(data, dict):
                data.setdefault("token", auth_header.replace("Bearer ", ""))
            return _success_response_with_auth(data, response.status_code, auth_header)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.post("/memory/auth/sign-in/mobile")
def sign_in_with_mobile(
    payload: SignInMobilePayload,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    body = {
        "mobile_number": payload.mobile_number,
        "pass_code": payload.pass_code,
        "login_type": payload.login_type,
    }
    if payload.app_id:
        body["app_id"] = payload.app_id

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.DefaultApi(api_client)
            response = api.sign_in_with_mobile_number_with_http_info(body=body)
            auth_header = _extract_auth_header(response.headers)
            data = _to_plain(response.data)
            if auth_header and isinstance(data, dict):
                data.setdefault("token", auth_header.replace("Bearer ", ""))
            return _success_response_with_auth(data, response.status_code, auth_header)
    except ApiException as exc:
        return _sdk_exception_response(exc)


@app.post("/memory/auth/send-validation-code")
def send_validation_code(
    payload: SendValidationCodePayload,
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_access_token(authorization)

    request_payload: Dict[str, Any] = {"mode": payload.mode}
    if payload.user_id:
        request_payload["user_id"] = payload.user_id
    if payload.email_id:
        request_payload["email_id"] = payload.email_id
    if payload.mobile_number:
        request_payload["mobiles_number"] = payload.mobile_number

    try:
        with _sdk_client(token) as api_client:
            api = xfloor_memory_sdk.DefaultApi(api_client)
            request_model = xfloor_memory_sdk.SendValidationCodeRequest.from_dict(request_payload)
            response = api.send_validation_code(request_model)
            return _to_plain(response)
    except ApiException as exc:
        return _sdk_exception_response(exc)
