package ai.xfloor.examples.memory.controller;

import ai.xfloor.examples.memory.config.XfloorProperties;
import ai.xfloor.memory.api.DefaultApi;
import ai.xfloor.memory.api.EditFloorApi;
import ai.xfloor.memory.api.EventApi;
import ai.xfloor.memory.api.GetFloorInformationApi;
import ai.xfloor.memory.api.GetRecentEventsApi;
import ai.xfloor.memory.api.QueryApi;
import ai.xfloor.memory.client.ApiClient;
import ai.xfloor.memory.client.ApiException;
import ai.xfloor.memory.client.ApiResponse;
import ai.xfloor.memory.client.JSON;
import ai.xfloor.memory.client.Pair;
import ai.xfloor.memory.model.ConversationThreads200Response;
import ai.xfloor.memory.model.EventResponse;
import ai.xfloor.memory.model.GetConversations200Response;
import ai.xfloor.memory.model.GetFloorInformation200Response;
import ai.xfloor.memory.model.GetRecentEvents200Response;
import ai.xfloor.memory.model.QueryRequest;
import ai.xfloor.memory.model.QueryRequestFilters;
import ai.xfloor.memory.model.QueryResponse;
import ai.xfloor.memory.model.SendValidationCodeRequest;
import ai.xfloor.memory.model.SignInWithEmail200Response;
import ai.xfloor.memory.model.SignUp200Response;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.net.ssl.SSLException;
import okhttp3.Call;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class MemoryController {
  private static final Logger log = LoggerFactory.getLogger(MemoryController.class);
  private final XfloorProperties properties;
  private final Gson gson;

  public MemoryController(XfloorProperties properties) {
    this.properties = properties;
    this.gson = JSON.getGson();
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }

  @PostMapping("/memory/query")
  public ResponseEntity<Object> query(
      @RequestBody Map<String, Object> payload,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      QueryRequest request = buildQueryRequest(payload);
      QueryApi api = new QueryApi(createClient(accessToken));
      QueryResponse response = api.query(request);
      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @PostMapping(value = "/memory/events", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Object> createEvent(
      @RequestParam("input_info") String inputInfo,
      @RequestParam("app_id") String appId,
      @RequestPart(value = "files", required = false) List<MultipartFile> files,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);
    List<File> tempFiles = new ArrayList<>();

    try {
      tempFiles = toTempFiles(files);
      ApiClient client = createClient(accessToken);
      EventApi api = new EventApi(client);
      EventResponse response;
      System.out.println("Input INfo:" + inputInfo);
      if (tempFiles.isEmpty()) {
        response = api.event(inputInfo, appId, null);
      } else if (tempFiles.size() == 1) {
        response = api.event(inputInfo, appId, tempFiles.get(0));
      } else {
        response = createEventWithMultipleFiles(client, inputInfo, appId, tempFiles);
      }

      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    } finally {
      cleanupFiles(tempFiles);
    }
  }

  @GetMapping("/memory/recent-events")
  public ResponseEntity<Object> getRecentEvents(
      @RequestParam("floor_id") String floorId,
      @RequestParam("app_id") String appId,
      @RequestParam(value = "user_id", required = false) String userId,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      GetRecentEventsApi api = new GetRecentEventsApi(createClient(accessToken));
      GetRecentEvents200Response response = api.getRecentEvents(floorId, appId, userId);
      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @GetMapping("/memory/floors/{floorId}")
  public ResponseEntity<Object> getFloorInformation(
      @PathVariable("floorId") String floorId,
      @RequestParam("app_id") String appId,
      @RequestParam(value = "user_id", required = false) String userId,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);
    log.info(
        "Incoming /memory/floors request floorId={} appId={} userId={} token={}",
        floorId,
        appId,
        userId,
        maskToken(accessToken));

    try {
      GetFloorInformationApi api = new GetFloorInformationApi(createClient(accessToken));
      GetFloorInformation200Response response = api.getFloorInformation(floorId, appId, userId);
      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      log.warn(
          "xFloor floor info failed code={} floorId={} appId={} userId={} body={}",
          ex.getCode(),
          floorId,
          appId,
          userId,
          ex.getResponseBody());
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @PostMapping(value = "/memory/floors/{floorId}/edit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Object> editFloor(
      @PathVariable("floorId") String floorId,
      @RequestParam("user_id") String userId,
      @RequestParam("app_id") String appId,
      @RequestParam(value = "title", required = false) String title,
      @RequestParam(value = "details", required = false) String details,
      @RequestPart(value = "logo_file", required = false) MultipartFile logoFile,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);
    File logoTempFile = null;

    try {
      logoTempFile = toTempFile(logoFile);
      EditFloorApi api = new EditFloorApi(createClient(accessToken));
      GetFloorInformation200Response response =
          api.editFloor(floorId, userId, appId, logoTempFile, title, details);
      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    } finally {
      cleanupFile(logoTempFile);
    }
  }

  @GetMapping("/memory/conversations")
  public ResponseEntity<Object> getConversations(
      @RequestParam(value = "user_id", required = false) String userId,
      @RequestParam(value = "thread_id", required = false) String threadId,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      DefaultApi api = new DefaultApi(createClient(accessToken));
      GetConversations200Response response = api.getConversations(userId, threadId);
      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @GetMapping("/memory/threads")
  public ResponseEntity<Object> getThreads(
      @RequestParam("user_id") String userId,
      @RequestParam("floor_id") String floorId,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      DefaultApi api = new DefaultApi(createClient(accessToken));
      ConversationThreads200Response response = api.conversationThreads(userId, floorId);
      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @PostMapping("/memory/auth/sign-up")
  public ResponseEntity<Object> signUp(
      @RequestBody Map<String, Object> payload,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      String name = requiredString(payload, "name");
      String password = requiredString(payload, "password");
      String emailId = optionalString(payload, "email_id");
      String mobileNumber = optionalString(payload, "mobile_number");
      String appId = optionalString(payload, "app_id");

      DefaultApi api = new DefaultApi(createClient(accessToken));
      ApiResponse<SignUp200Response> response =
          api.signUpWithHttpInfo(name, password, emailId, mobileNumber, appId);

      String authHeader = extractAuthorizationHeader(response.getHeaders());
      Object responseBody = attachToken(toPlain(response.getData()), authHeader);
      return successResponseWithAuth(response.getStatusCode(), responseBody, authHeader);
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @PostMapping("/memory/auth/sign-in/email")
  public ResponseEntity<Object> signInWithEmail(
      @RequestBody Map<String, Object> payload,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      String emailId = requiredString(payload, "email_id");
      String passCode = requiredString(payload, "pass_code");
      String loginType = requiredString(payload, "login_type");
      String appId = optionalString(payload, "app_id");

      DefaultApi api = new DefaultApi(createClient(accessToken));
      ApiResponse<SignInWithEmail200Response> response =
          api.signInWithEmailWithHttpInfo(emailId, passCode, loginType, appId);

      String authHeader = extractAuthorizationHeader(response.getHeaders());
      Object responseBody = attachToken(toPlain(response.getData()), authHeader);
      return successResponseWithAuth(response.getStatusCode(), responseBody, authHeader);
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @PostMapping("/memory/auth/sign-in/mobile")
  public ResponseEntity<Object> signInWithMobile(
      @RequestBody Map<String, Object> payload,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      Map<String, Object> body = new LinkedHashMap<>();
      body.put("mobile_number", requiredString(payload, "mobile_number"));
      body.put("pass_code", requiredString(payload, "pass_code"));
      body.put("login_type", requiredString(payload, "login_type"));

      String appId = optionalString(payload, "app_id");
      if (appId != null) {
        body.put("app_id", appId);
      }

      DefaultApi api = new DefaultApi(createClient(accessToken));
      ApiResponse<SignInWithEmail200Response> response = api.signInWithMobileNumberWithHttpInfo(body);

      String authHeader = extractAuthorizationHeader(response.getHeaders());
      Object responseBody = attachToken(toPlain(response.getData()), authHeader);
      return successResponseWithAuth(response.getStatusCode(), responseBody, authHeader);
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  @PostMapping("/memory/auth/send-validation-code")
  public ResponseEntity<Object> sendValidationCode(
      @RequestBody Map<String, Object> payload,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    String accessToken = extractAccessToken(authorization);

    try {
      SendValidationCodeRequest request = new SendValidationCodeRequest();
      request.mode(requiredString(payload, "mode"));

      String userId = optionalString(payload, "user_id");
      if (userId != null) {
        request.userId(userId);
      }

      String emailId = optionalString(payload, "email_id");
      if (emailId != null) {
        request.emailId(emailId);
      }

      String mobileNumber = optionalString(payload, "mobile_number");
      if (mobileNumber != null) {
        request.mobilesNumber(mobileNumber);
      }

      DefaultApi api = new DefaultApi(createClient(accessToken));
      Object response = api.sendValidationCode(request);
      return ResponseEntity.ok(toPlain(response));
    } catch (ApiException ex) {
      return sdkExceptionResponse(ex);
    } catch (Exception ex) {
      return unexpectedExceptionResponse(ex);
    }
  }

  private ApiClient createClient(String accessToken) throws IOException {
    ApiClient client = new ApiClient();
    client.setBasePath(properties.getApiBaseUrl());
    client.setVerifyingSsl(properties.isVerifySslEnabled());

    String caCertPath = properties.getSslCaCert();
    if (caCertPath != null && !caCertPath.isBlank()) {
      try (InputStream caCert = Files.newInputStream(Path.of(caCertPath.trim()))) {
        client.setSslCaCert(caCert);
      }
    }

    if (accessToken != null && !accessToken.isBlank()) {
      client.setBearerToken(accessToken);
    }

    return client;
  }

  private EventResponse createEventWithMultipleFiles(
      ApiClient apiClient, String inputInfo, String appId, List<File> files) throws ApiException {
    Map<String, Object> formParams = new LinkedHashMap<>();
    formParams.put("files", files);
    formParams.put("input_info", inputInfo);
    formParams.put("app_id", appId);

    Map<String, String> headerParams = new LinkedHashMap<>();
    headerParams.put("Accept", "application/json");
    headerParams.put("Content-Type", "multipart/form-data");

    Call call =
        apiClient.buildCall(
            apiClient.getBasePath(),
            "/api/memory/events",
            "POST",
            new ArrayList<Pair>(),
            new ArrayList<Pair>(),
            null,
            headerParams,
            new LinkedHashMap<String, String>(),
            formParams,
            new String[] {"bearer"},
            null);

    Type returnType = new TypeToken<EventResponse>() {}.getType();
    ApiResponse<EventResponse> response = apiClient.execute(call, returnType);
    return response.getData();
  }

  private QueryRequest buildQueryRequest(Map<String, Object> payload) {
    QueryRequest request =
        new QueryRequest()
            .userId(requiredString(payload, "user_id"))
            .query(requiredString(payload, "query"))
            .floorIds(requiredStringList(payload, "floor_ids"))
            .appId(requiredString(payload, "app_id"))
            .includeMetadata(defaultString(optionalString(payload, "include_metadata"), "1"))
            .summaryNeeded(defaultString(optionalString(payload, "summary_needed"), "1"));

    Map<String, Object> filtersPayload = optionalMap(payload, "filters");
    QueryRequestFilters filters = buildFilters(filtersPayload);
    if (filters != null) {
      request.filters(filters);
    }

    return request;
  }

  private QueryRequestFilters buildFilters(Map<String, Object> filtersPayload) {
    if (filtersPayload == null || filtersPayload.isEmpty()) {
      return null;
    }

    String timeFrom = optionalString(filtersPayload, "time_from");
    String timeTo = optionalString(filtersPayload, "time_to");
    String filterTypes = optionalString(filtersPayload, "filter_types");
    String filterTags = optionalString(filtersPayload, "filter_tags");

    if (timeFrom == null || timeTo == null || filterTypes == null || filterTags == null) {
      return null;
    }

    return new QueryRequestFilters()
        .timeFrom(timeFrom)
        .timeTo(timeTo)
        .filterTypes(filterTypes)
        .filterTags(filterTags);
  }

  private String extractAccessToken(String authorization) {
    if (authorization == null) {
      return null;
    }

    String value = authorization.trim();
    if (value.isEmpty()) {
      return null;
    }

    if (value.toLowerCase(Locale.ROOT).startsWith("bearer ")) {
      String token = value.substring(7).trim();
      return token.isEmpty() ? null : token;
    }

    return value;
  }

  private String maskToken(String token) {
    if (token == null || token.isBlank()) {
      return null;
    }

    String value = token.trim();
    if (value.length() <= 14) {
      return "***";
    }
    return value.substring(0, 8) + "..." + value.substring(value.length() - 6);
  }

  private String extractAuthorizationHeader(Map<String, List<String>> headers) {
    if (headers == null) {
      return null;
    }

    for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
      if (entry.getKey() == null || !"authorization".equalsIgnoreCase(entry.getKey())) {
        continue;
      }

      List<String> values = entry.getValue();
      if (values == null || values.isEmpty()) {
        continue;
      }

      String headerValue = values.get(0);
      if (headerValue != null && !headerValue.isBlank()) {
        return headerValue;
      }
    }

    return null;
  }

  private ResponseEntity<Object> successResponseWithAuth(
      int statusCode, Object body, String authorizationHeader) {
    ResponseEntity.BodyBuilder builder = ResponseEntity.status(statusCode);
    if (authorizationHeader != null && !authorizationHeader.isBlank()) {
      builder.header(HttpHeaders.AUTHORIZATION, authorizationHeader);
    }
    return builder.body(body);
  }

  private Object attachToken(Object body, String authorizationHeader) {
    if (!(body instanceof Map<?, ?> map)) {
      return body;
    }

    String token = extractAccessToken(authorizationHeader);
    if (token == null) {
      return body;
    }

    Map<String, Object> mutableBody = toStringKeyMap(map);
    mutableBody.putIfAbsent("token", token);
    return mutableBody;
  }

  private ResponseEntity<Object> sdkExceptionResponse(ApiException ex) {
    int status = ex.getCode() > 0 ? ex.getCode() : HttpStatus.BAD_GATEWAY.value();
    Object parsedBody = parseJson(ex.getResponseBody());
    String message = extractMessage(parsedBody, "xFloor SDK request failed");

    Object content;
    if (parsedBody instanceof Map<?, ?> parsedMap && parsedMap.containsKey("error")) {
      content = toStringKeyMap(parsedMap);
    } else if (parsedBody instanceof Map<?, ?> || parsedBody instanceof List<?>) {
      content = buildError(message, parsedBody);
    } else {
      content =
          buildError(
              message,
              ex.getResponseBody() != null && !ex.getResponseBody().isBlank()
                  ? ex.getResponseBody()
                  : null);
    }

    return ResponseEntity.status(status).body(content);
  }

  private ResponseEntity<Object> unexpectedExceptionResponse(Exception ex) {
    String details = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
    String lowered = details.toLowerCase(Locale.ROOT);

    if (ex instanceof IllegalArgumentException) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
          .body(buildError("Invalid request payload.", details));
    }

    if (ex instanceof SSLException
        || lowered.contains("certificate_verify_failed")
        || lowered.contains("certificate verify failed")) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
          .body(
              buildError(
                  "TLS certificate verification failed while connecting to xFloor API. "
                      + "Fix local trust store (recommended) or set XFLOOR_SSL_CA_CERT.",
                  details));
    }

    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(buildError("Unexpected server error.", details));
  }

  private Object toPlain(Object value) {
    if (value == null) {
      return null;
    }
    return gson.fromJson(gson.toJson(value), Object.class);
  }

  private Object parseJson(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return gson.fromJson(value, Object.class);
    } catch (Exception ignored) {
      return null;
    }
  }

  private String extractMessage(Object payload, String fallback) {
    if (payload instanceof Map<?, ?> map) {
      Object errorObject = map.get("error");
      if (errorObject instanceof Map<?, ?> errorMap) {
        String errorMessage = asNonBlankString(errorMap.get("message"));
        if (errorMessage != null) {
          return errorMessage;
        }
      }

      String message = asNonBlankString(map.get("message"));
      if (message != null) {
        return message;
      }

      String detail = asNonBlankString(map.get("detail"));
      if (detail != null) {
        return detail;
      }
    }

    return fallback;
  }

  private Map<String, Object> buildError(String message, Object details) {
    Map<String, Object> error = new LinkedHashMap<>();
    error.put("message", message);
    if (details != null) {
      error.put("details", details);
    }

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("error", error);
    return response;
  }

  private String requiredString(Map<String, Object> payload, String key) {
    String value = optionalString(payload, key);
    if (value == null) {
      throw new IllegalArgumentException("Missing required field: " + key);
    }
    return value;
  }

  private String optionalString(Map<String, Object> payload, String key) {
    return asNonBlankString(payload.get(key));
  }

  private String defaultString(String value, String fallback) {
    return value == null ? fallback : value;
  }

  private List<String> requiredStringList(Map<String, Object> payload, String key) {
    Object value = payload.get(key);
    if (!(value instanceof List<?> rawList) || rawList.isEmpty()) {
      throw new IllegalArgumentException("Missing required field: " + key);
    }

    List<String> normalized = new ArrayList<>();
    for (Object item : rawList) {
      String normalizedItem = asNonBlankString(item);
      if (normalizedItem != null) {
        normalized.add(normalizedItem);
      }
    }

    if (normalized.isEmpty()) {
      throw new IllegalArgumentException("Missing required field: " + key);
    }

    return normalized;
  }

  private Map<String, Object> optionalMap(Map<String, Object> payload, String key) {
    Object value = payload.get(key);
    if (!(value instanceof Map<?, ?> rawMap)) {
      return null;
    }
    return toStringKeyMap(rawMap);
  }

  private String asNonBlankString(Object value) {
    if (value == null) {
      return null;
    }

    String normalized = String.valueOf(value).trim();
    if (normalized.isEmpty()) {
      return null;
    }
    return normalized;
  }

  private Map<String, Object> toStringKeyMap(Map<?, ?> raw) {
    Map<String, Object> mapped = new LinkedHashMap<>();
    for (Map.Entry<?, ?> entry : raw.entrySet()) {
      if (entry.getKey() != null) {
        mapped.put(String.valueOf(entry.getKey()), entry.getValue());
      }
    }
    return mapped;
  }

  private List<File> toTempFiles(List<MultipartFile> multipartFiles) throws IOException {
    List<File> tempFiles = new ArrayList<>();
    if (multipartFiles == null) {
      return tempFiles;
    }

    for (MultipartFile multipartFile : multipartFiles) {
      File tempFile = toTempFile(multipartFile);
      if (tempFile != null) {
        tempFiles.add(tempFile);
      }
    }

    return tempFiles;
  }

  private File toTempFile(MultipartFile multipartFile) throws IOException {
    if (multipartFile == null || multipartFile.isEmpty()) {
      return null;
    }

    String suffix = fileSuffix(multipartFile.getOriginalFilename());
    File tempFile = File.createTempFile("xfloor-upload-", suffix);
    multipartFile.transferTo(tempFile);
    return tempFile;
  }

  private String fileSuffix(String filename) {
    if (filename == null) {
      return ".tmp";
    }

    int index = filename.lastIndexOf('.');
    if (index < 0 || index >= filename.length() - 1) {
      return ".tmp";
    }

    String suffix = filename.substring(index);
    return suffix.length() <= 12 ? suffix : ".tmp";
  }

  private void cleanupFiles(List<File> files) {
    if (files == null) {
      return;
    }

    for (File file : files) {
      cleanupFile(file);
    }
  }

  private void cleanupFile(File file) {
    if (file == null || !file.exists()) {
      return;
    }

    if (!file.delete()) {
      file.deleteOnExit();
    }
  }
}
