import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "GPT Crawler API",
    description: "GPT Crawler",
  },
  host: "localhost:5000",
};

const outputFile = "swagger-output.json";
const routes = ["./src/server.ts"];

swaggerAutogen()(outputFile, routes, doc);
