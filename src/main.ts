if (process.env.NODE_ENV != "production") {
  import("source-map-support/register");
}
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded } from "body-parser";
import { AppModule } from "./app.module";
import { createDirs } from "./utils/create-files";

createDirs()

/**
 * @returns true if the specified tag is surrounded with `{`
 * and `}` characters.
 *
 * @example
 * Prints "true" for `{@link}` but "false" for `@internal`:
 * ```ts
 * console.log(isInlineTag('{@link}'))
 * console.log(isInlineTag('@internal'))
 * ```
 * @see {@link http://example.com/@internal | the @internal tag}
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: "50mb" }));
  app.use(
    urlencoded({ limit: "50mb", extended: true, parameterLimit: 1000000 }),
  );
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors()

  const options = new DocumentBuilder()
    .setTitle("SAEV API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("v1/swagger", app, document);
  await app.listen(process.env.PORT || 8080);
}
bootstrap();
