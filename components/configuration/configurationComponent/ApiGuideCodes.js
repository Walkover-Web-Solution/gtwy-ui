import { extractPromptVariables } from "@/utils/utility";

const buildVariables = (prompt) => {
  const used = extractPromptVariables(prompt);
  return used.length > 0
    ? used.map((v) => `    "${v}": "YOUR_${v.toUpperCase()}_VALUE"`).join(",\n")
    : "    // No variables found in prompt";
};

const buildPythonVariables = (prompt) => {
  const used = extractPromptVariables(prompt);
  return used.length > 0
    ? used.map((v) => `            "${v}": "YOUR_${v.toUpperCase()}_VALUE",`).join("\n")
    : "            # No variables found in prompt";
};

export const getCurlCode = (bridgeId, modelType, isEmbedUser, prompt = "") => {
  const url = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/chat/completion`;
  const authHeader = isEmbedUser
    ? `--header 'Content-Type: application/json'`
    : `--header 'pauthkey: YOUR_GENERATED_PAUTHKEY' \\\n  --header 'Content-Type: application/json'`;

  const body = [
    "{",
    `  ${modelType === "embedding" ? '"text": "YOUR_TEXT_HERE",' : '"user": "YOUR_USER_QUESTION",'}`,
    `  "agent_id": "${bridgeId}",`,
    `  "thread_id": "YOUR_THREAD_ID",`,
    `  "response_type": "text",`,
    `  "variables": {`,
    buildVariables(prompt),
    `  }`,
    "}",
  ].join("\n");

  return `curl --location '${url}' \\\n  ${authHeader} \\\n  --data '${body}'`;
};

export const getCurlBatchCode = (bridgeId, isEmbedUser) => {
  const url = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/chat/completion`;
  const authHeader = isEmbedUser
    ? `--header 'Content-Type: application/json'`
    : `--header 'pauthkey: YOUR_GENERATED_PAUTHKEY' \\\n  --header 'Content-Type: application/json'`;

  const body = [
    "{",
    `  "webhook": {`,
    `    "url": "YOUR_WEBHOOK_URL",`,
    `    "headers": {}`,
    `  },`,
    `  "batch": [`,
    `    "YOUR QUESTION 1",`,
    `    "YOUR QUESTION 2",`,
    `    "YOUR QUESTION 3"`,
    `  ],`,
    `  "agent_id": "${bridgeId}",`,
    `  "batch_variables": [`,
    `    { "message": "YOUR MESSAGE" },`,
    `    { "name": "YOUR NAME" },`,
    `    { "age": "YOUR AGE" }`,
    `  ]`,
    "}",
  ].join("\n");

  return `curl --location '${url}' \\\n  ${authHeader} \\\n  --data '${body}'`;
};

export const getPythonCode = (bridgeId, isEmbedUser, prompt = "") => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/openai`;
  const apiKeyLine = isEmbedUser
    ? "    # No API key required for embed users"
    : `    api_key="YOUR_GENERATED_PAUTHKEY",`;

  return [
    "from openai import OpenAI",
    "",
    "client = OpenAI(",
    apiKeyLine,
    `    base_url="${baseUrl}",`,
    ")",
    "",
    "response = client.responses.create(",
    `    model="YOUR_MODEL_NAME",`,
    `    input="YOUR_USER_QUESTION",`,
    "    extra_body={",
    `        "agent_id": "${bridgeId}",`,
    `        "variables": {`,
    buildPythonVariables(prompt),
    "        },",
    "    },",
    ")",
    "",
    "print(response.output_text)",
  ].join("\n");
};

export const getPythonBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/openai`;
  const apiKeyLine = isEmbedUser
    ? "    # No API key required for embed users"
    : `    api_key="YOUR_GENERATED_PAUTHKEY",`;

  return [
    "from openai import OpenAI",
    "",
    "client = OpenAI(",
    apiKeyLine,
    `    base_url="${baseUrl}",`,
    ")",
    "",
    "batch_job = client.responses.create(",
    `    model="YOUR_MODEL_NAME",`,
    "    extra_body={",
    `        "agent_id": "${bridgeId}",`,
    '        "batch": ["YOUR QUESTION 1", "YOUR QUESTION 2", "YOUR QUESTION 3"],',
    '        "batch_variables": [',
    '            {"message": "YOUR MESSAGE"},',
    '            {"name": "YOUR NAME"},',
    '            {"age": "YOUR AGE"},',
    "        ],",
    '        "webhook": {"url": "YOUR_WEBHOOK_URL", "headers": {}},',
    "    },",
    ")",
    "",
    "print(batch_job.id)",
  ].join("\n");
};

export const getJavaScriptCode = (bridgeId, isEmbedUser, prompt = "") => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/openai`;
  const used = extractPromptVariables(prompt);
  const varsBlock =
    used.length > 0
      ? used.map((v) => `    "${v}": "YOUR_${v.toUpperCase()}_VALUE",`).join("\n")
      : "    // No variables found in prompt";
  const apiKeyLine = isEmbedUser ? "  // No API key required for embed users" : `  apiKey: "YOUR_GENERATED_PAUTHKEY",`;

  return [
    `import OpenAI from "openai";`,
    "",
    "const client = new OpenAI({",
    apiKeyLine,
    `  baseURL: "${baseUrl}",`,
    "});",
    "",
    "const response = await client.responses.create({",
    `  model: "YOUR_MODEL_NAME",`,
    `  agent_id: "${bridgeId}",`,
    `  input: "YOUR_USER_QUESTION",`,
    "  variables: {",
    varsBlock,
    "  },",
    "});",
    "",
    "console.log(response.output_text);",
  ].join("\n");
};

export const getJavaScriptBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/openai`;
  const apiKeyLine = isEmbedUser ? "  // No API key required for embed users" : `  apiKey: "YOUR_GENERATED_PAUTHKEY",`;

  return [
    `import OpenAI from "openai";`,
    "",
    "const client = new OpenAI({",
    apiKeyLine,
    `  baseURL: "${baseUrl}",`,
    "});",
    "",
    "const batchJob = await client.responses.create({",
    `  model: "YOUR_MODEL_NAME",`,
    `  agent_id: "${bridgeId}",`,
    '  batch: ["YOUR QUESTION 1", "YOUR QUESTION 2", "YOUR QUESTION 3"],',
    "  batch_variables: [",
    '    { message: "YOUR MESSAGE" },',
    '    { name: "YOUR NAME" },',
    '    { age: "YOUR AGE" },',
    "  ],",
    '  webhook: { url: "YOUR_WEBHOOK_URL", headers: {} },',
    "});",
    "",
    "console.log(batchJob.id);",
  ].join("\n");
};

export const getDotNetCode = (bridgeId, isEmbedUser, prompt = "") => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/openai`;
  const used = extractPromptVariables(prompt);
  const varsLines =
    used.length > 0
      ? used
          .map((v) => `                ["${v}"] = BinaryData.FromString('"YOUR_${v.toUpperCase()}_VALUE"')`)
          .join(",\n")
      : "                // No variables found in prompt";
  const apiKeyLine = isEmbedUser
    ? `            apiKey: "",  // No API key required for embed users`
    : `            apiKey: "YOUR_GENERATED_PAUTHKEY",`;

  return [
    "using System;",
    "using System.Threading.Tasks;",
    "using OpenAI;",
    "",
    "class Program",
    "{",
    "    static async Task Main()",
    "    {",
    "        var client = new OpenAIClient(",
    apiKeyLine,
    "            options: new OpenAIClientOptions",
    "            {",
    `                Endpoint = new Uri("${baseUrl}")`,
    "            }",
    "        );",
    "",
    "        var response = await client.Responses.CreateAsync(new ResponseCreateRequest",
    "        {",
    `            Model = "YOUR_MODEL_NAME",`,
    `            Input = "YOUR_USER_QUESTION",`,
    "            AdditionalProperties =",
    "            {",
    `                ["agent_id"] = BinaryData.FromString('"${bridgeId}"'),`,
    `                ["variables"] = BinaryData.FromObjectAsJson(new`,
    "                {",
    varsLines,
    "                })",
    "            }",
    "        });",
    "",
    `        Console.WriteLine($"[ASSISTANT]: {response.OutputText()}");`,
    "    }",
    "}",
  ].join("\n");
};

export const getDotNetBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/openai`;
  const apiKeyLine = isEmbedUser
    ? `            apiKey: "",  // No API key required for embed users`
    : `            apiKey: "YOUR_GENERATED_PAUTHKEY",`;

  return [
    "using System;",
    "using System.Threading.Tasks;",
    "using OpenAI;",
    "",
    "class Program",
    "{",
    "    static async Task Main()",
    "    {",
    "        var client = new OpenAIClient(",
    apiKeyLine,
    "            options: new OpenAIClientOptions",
    "            {",
    `                Endpoint = new Uri("${baseUrl}")`,
    "            }",
    "        );",
    "",
    "        var batchJob = await client.Responses.CreateAsync(new ResponseCreateRequest",
    "        {",
    `            Model = "YOUR_MODEL_NAME",`,
    "            AdditionalProperties =",
    "            {",
    `                ["agent_id"] = BinaryData.FromString('"${bridgeId}"'),`,
    '                ["batch"] = BinaryData.FromObjectAsJson(new[] { "YOUR QUESTION 1", "YOUR QUESTION 2", "YOUR QUESTION 3" }),',
    '                ["batch_variables"] = BinaryData.FromObjectAsJson(new object[]',
    "                {",
    '                    new { message = "YOUR MESSAGE" },',
    '                    new { name = "YOUR NAME" },',
    '                    new { age = "YOUR AGE" }',
    "                }),",
    '                ["webhook"] = BinaryData.FromObjectAsJson(new { url = "YOUR_WEBHOOK_URL", headers = new { } })',
    "            }",
    "        });",
    "",
    `        Console.WriteLine($"[BATCH JOB ID]: {batchJob.Id}");`,
    "    }",
    "}",
  ].join("\n");
};

export const getJavaCode = (bridgeId, isEmbedUser, prompt = "") => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/openai`;
  const used = extractPromptVariables(prompt);
  const varsLines =
    used.length > 0
      ? used.map((v) => `            .putAdditionalBodyProperty("${v}", "YOUR_${v.toUpperCase()}_VALUE")`).join("\n")
      : "            // No variables found in prompt";
  const apiKeyLine = isEmbedUser
    ? "            // No API key required for embed users"
    : `            .apiKey("YOUR_GENERATED_PAUTHKEY")`;

  return [
    "import com.openai.client.OpenAIClient;",
    "import com.openai.client.okhttp.OpenAIOkHttpClient;",
    "import com.openai.models.responses.Response;",
    "import com.openai.models.responses.ResponseCreateParams;",
    "",
    "public class Main {",
    "    public static void main(String[] args) {",
    "        OpenAIClient client = OpenAIOkHttpClient.builder()",
    apiKeyLine,
    `            .baseUrl("${baseUrl}")`,
    "            .build();",
    "",
    "        ResponseCreateParams params = ResponseCreateParams.builder()",
    `            .model("YOUR_MODEL_NAME")`,
    `            .input("YOUR_USER_QUESTION")`,
    `            .putAdditionalBodyProperty("agent_id", "${bridgeId}")`,
    varsLines,
    "            .build();",
    "",
    "        Response response = client.responses().create(params);",
    "        System.out.println(response.outputText());",
    "    }",
    "}",
  ].join("\n");
};

export const getJavaBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/openai`;
  const apiKeyLine = isEmbedUser
    ? "            // No API key required for embed users"
    : `            .apiKey("YOUR_GENERATED_PAUTHKEY")`;

  return [
    "import com.openai.client.OpenAIClient;",
    "import com.openai.client.okhttp.OpenAIOkHttpClient;",
    "import com.openai.models.responses.Response;",
    "import com.openai.models.responses.ResponseCreateParams;",
    "",
    "public class Main {",
    "    public static void main(String[] args) {",
    "        OpenAIClient client = OpenAIOkHttpClient.builder()",
    apiKeyLine,
    `            .baseUrl("${baseUrl}")`,
    "            .build();",
    "",
    "        ResponseCreateParams params = ResponseCreateParams.builder()",
    `            .model("YOUR_MODEL_NAME")`,
    `            .putAdditionalBodyProperty("agent_id", "${bridgeId}")`,
    '            .putAdditionalBodyProperty("batch", java.util.List.of("YOUR QUESTION 1", "YOUR QUESTION 2", "YOUR QUESTION 3"))',
    '            .putAdditionalBodyProperty("batch_variables", java.util.List.of(',
    '                java.util.Map.of("message", "YOUR MESSAGE"),',
    '                java.util.Map.of("name", "YOUR NAME"),',
    '                java.util.Map.of("age", "YOUR AGE")',
    "            ))",
    '            .putAdditionalBodyProperty("webhook", java.util.Map.of("url", "YOUR_WEBHOOK_URL", "headers", java.util.Map.of()))',
    "            .build();",
    "",
    "        Response batchJob = client.responses().create(params);",
    "        System.out.println(batchJob.id());",
    "    }",
    "}",
  ].join("\n");
};

export const getGoCode = (bridgeId, isEmbedUser, prompt = "") => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/openai`;
  const used = extractPromptVariables(prompt);
  const varsLines =
    used.length > 0
      ? used.map((v) => `\t\t"${v}": "YOUR_${v.toUpperCase()}_VALUE",`).join("\n")
      : "\t\t// No variables found in prompt";
  const apiKeyLine = isEmbedUser
    ? `\toption.WithAPIKey(""), // No API key required for embed users`
    : `\toption.WithAPIKey("YOUR_GENERATED_PAUTHKEY"),`;

  return [
    "package main",
    "",
    "import (",
    '\t"context"',
    '\t"fmt"',
    "",
    '\t"github.com/openai/openai-go/v3"',
    '\t"github.com/openai/openai-go/v3/option"',
    '\t"github.com/openai/openai-go/v3/responses"',
    ")",
    "",
    "func main() {",
    "\tclient := openai.NewClient(",
    apiKeyLine,
    `\toption.WithBaseURL("${baseUrl}"),`,
    "\t)",
    "",
    "\tresp, err := client.Responses.New(context.TODO(), openai.ResponseNewParams{",
    `\t\tModel: "YOUR_MODEL_NAME",`,
    `\t\tInput: responses.ResponseNewParamsInputUnion{OfString: openai.String("YOUR_USER_QUESTION")},`,
    "\t},",
    `\t\toption.WithJSONSet("agent_id", "${bridgeId}"),`,
    `\t\toption.WithJSONSet("variables", map[string]string{`,
    varsLines,
    "\t\t}),",
    "\t)",
    "\tif err != nil {",
    "\t\tpanic(err.Error())",
    "\t}",
    "",
    "\tfmt.Println(resp.OutputText())",
    "}",
  ].join("\n");
};

export const getGoBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/openai`;
  const apiKeyLine = isEmbedUser
    ? `\toption.WithAPIKey(""), // No API key required for embed users`
    : `\toption.WithAPIKey("YOUR_GENERATED_PAUTHKEY"),`;

  return [
    "package main",
    "",
    "import (",
    '\t"context"',
    '\t"fmt"',
    "",
    '\t"github.com/openai/openai-go/v3"',
    '\t"github.com/openai/openai-go/v3/option"',
    ")",
    "",
    "func main() {",
    "\tclient := openai.NewClient(",
    apiKeyLine,
    `\toption.WithBaseURL("${baseUrl}"),`,
    "\t)",
    "",
    "\tbatchJob, err := client.Responses.New(context.TODO(), openai.ResponseNewParams{",
    `\t\tModel: "YOUR_MODEL_NAME",`,
    "\t},",
    `\t\toption.WithJSONSet("agent_id", "${bridgeId}"),`,
    '\t\toption.WithJSONSet("batch", []string{"YOUR QUESTION 1", "YOUR QUESTION 2", "YOUR QUESTION 3"}),',
    '\t\toption.WithJSONSet("batch_variables", []map[string]string{',
    '\t\t\t{"message": "YOUR MESSAGE"},',
    '\t\t\t{"name": "YOUR NAME"},',
    '\t\t\t{"age": "YOUR AGE"},',
    "\t\t}),",
    '\t\toption.WithJSONSet("webhook", map[string]interface{}{"url": "YOUR_WEBHOOK_URL", "headers": map[string]string{}}),',
    "\t)",
    "\tif err != nil {",
    "\t\tpanic(err.Error())",
    "\t}",
    "",
    "\tfmt.Println(batchJob.ID)",
    "}",
  ].join("\n");
};

// Response formats

export const getCurlResponseFormat = () =>
  JSON.stringify(
    {
      success: true,
      response: {
        data: {
          id: "chatcmpl-d7a6874d-a82f-4cb5-8a40-1c899722c64f",
          content: "Response from the AI assistant",
          model: "your-model-name",
          role: "assistant",
          tools_data: {},
          fallback: false,
          finish_reason: "completed",
          message_id: "abdd920a-ec69-11f0-b14a-928ade59a1ee",
        },
        usage: {
          total_tokens: 500,
          input_tokens: 300,
          output_tokens: 200,
          cached_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
          reasoning_tokens: 0,
          cost: 0.0025,
        },
      },
    },
    null,
    2
  );

export const getSdkResponseFormat = () =>
  JSON.stringify(
    {
      id: "resp_d7a6874d-a82f-4cb5-8a40-1c899722c64f",
      object: "response",
      created_at: 1771660421,
      status: "completed",
      model: "your-model-name",
      output: [
        {
          id: "rs_de18a639a6144712a27a33c3fbe5ab17",
          type: "reasoning",
          summary: [],
        },
        {
          id: "msg_b051e3c65248486e97044615a7d3e779",
          type: "message",
          status: "completed",
          role: "assistant",
          content: [{ type: "output_text", text: "Response from the AI assistant" }],
        },
      ],
      user: "YOUR_USER_QUESTION",
      output_text: "Response from the AI assistant",
      finish_reason: "completed",
      usage: {
        input_tokens: 300,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 200,
        output_tokens_details: { reasoning_tokens: 64 },
        total_tokens: 500,
      },
    },
    null,
    2
  );
