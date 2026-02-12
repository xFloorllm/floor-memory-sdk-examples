package ai.xfloor.examples.memory;

import ai.xfloor.examples.memory.config.XfloorProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(XfloorProperties.class)
public class MemoryServerApplication {
  public static void main(String[] args) {
    SpringApplication.run(MemoryServerApplication.class, args);
  }
}

