package ai.xfloor.examples.memory.config;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "xfloor")
public class XfloorProperties {
  private String apiBaseUrl = "https://appfloor.in";
  private String verifySsl = "true";
  private String sslCaCert = "";
  private String corsAllowedOrigins =
      "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173";

  public String getApiBaseUrl() {
    return apiBaseUrl;
  }

  public void setApiBaseUrl(String apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
  }

  public String getVerifySsl() {
    return verifySsl;
  }

  public void setVerifySsl(String verifySsl) {
    this.verifySsl = verifySsl;
  }

  public String getSslCaCert() {
    return sslCaCert;
  }

  public void setSslCaCert(String sslCaCert) {
    this.sslCaCert = sslCaCert;
  }

  public String getCorsAllowedOrigins() {
    return corsAllowedOrigins;
  }

  public void setCorsAllowedOrigins(String corsAllowedOrigins) {
    this.corsAllowedOrigins = corsAllowedOrigins;
  }

  public boolean isVerifySslEnabled() {
    String normalized = verifySsl == null ? "true" : verifySsl.trim().toLowerCase(Locale.ROOT);
    return !normalized.equals("0")
        && !normalized.equals("false")
        && !normalized.equals("no")
        && !normalized.equals("off");
  }

  public List<String> getCorsAllowedOriginsList() {
    List<String> origins =
        Arrays.stream(corsAllowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();

    if (!origins.isEmpty()) {
      return origins;
    }

    return List.of("http://localhost:3000", "http://127.0.0.1:3000");
  }
}

