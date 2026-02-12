package ai.xfloor.examples.memory.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {
  @Bean
  public WebMvcConfigurer corsConfigurer(XfloorProperties properties) {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry
            .addMapping("/**")
            .allowedOrigins(properties.getCorsAllowedOriginsList().toArray(String[]::new))
            .allowedMethods("*")
            .allowedHeaders("*")
            .exposedHeaders("Authorization", "authorization")
            .allowCredentials(true);
      }
    };
  }
}

