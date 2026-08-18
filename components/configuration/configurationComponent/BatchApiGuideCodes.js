// Code-sample generators for the Batch API guide.
// Mirrors the pattern used for the main chat completion guide, but targets
// the batch completion route instead.

export const getCurlBatchCode = (bridgeId) => {
  return (
    `curl --location '${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}/api/v2/model/batch/chat/completion' \\\n` +
    `--header 'pauthkey: YOUR_GENERATED_PAUTHKEY' \\\n` +
    `--header 'Content-Type: application/json' \\\n` +
    `--data '{\n` +
    `    "webhook": {\n` +
    `        "url": "YOUR WEBHOOK URL",\n` +
    `        "headers": {}\n` +
    `    },\n` +
    `    "batch": [\n` +
    `        "YOUR QUESTION 1",\n` +
    `        "YOUR QUESTION 2",\n` +
    `        "YOUR QUESTION 3"\n` +
    `    ],\n` +
    `    "agent_id": "${bridgeId || ""}",\n` +
    `    "batch_variables": [\n` +
    `        {\n` +
    `            "message": "YOUR MESSAGE"\n` +
    `        },\n` +
    `        {\n` +
    `            "name": "YOUR NAME"\n` +
    `        },\n` +
    `        {\n` +
    `            "age": "YOUR AGE"\n` +
    `        }\n` +
    `    ]\n` +
    `}'`
  );
};

export const getGtwyPythonBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}`;
  const authKeyLine = isEmbedUser
    ? "    # No auth key required for embed users"
    : `    auth_key="YOUR_GENERATED_PAUTHKEY",`;

  return [
    "# pip install gtwy-sdk",
    "from gtwy import Gtwy",
    "",
    "client = Gtwy(",
    authKeyLine,
    `    base_url="${baseUrl}",`,
    ")",
    "",
    "response = client.batch.completions.create(",
    `    agent_id="${bridgeId}",`,
    "    batch=[",
    '        "YOUR QUESTION 1",',
    '        "YOUR QUESTION 2",',
    '        "YOUR QUESTION 3",',
    "    ],",
    '    batch_webhook="YOUR_WEBHOOK_URL",',
    "    batch_variables=[",
    '        {"message": "YOUR MESSAGE"},',
    '        {"name": "YOUR NAME"},',
    '        {"age": "YOUR AGE"},',
    "    ],",
    ")",
    "",
    "print(response.batch_id)",
  ].join("\n");
};

export const getGtwyNodeBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}`;
  const authKeyLine = isEmbedUser
    ? "  // No auth key required for embed users"
    : `  authKey: "YOUR_GENERATED_PAUTHKEY",`;

  return [
    "// npm install gtwy-sdk",
    `const { Gtwy } = require("gtwy-sdk");`,
    "",
    "const client = new Gtwy({",
    authKeyLine,
    `  baseUrl: "${baseUrl}",`,
    "});",
    "",
    "const response = await client.batch.completions.create({",
    `  agentId: "${bridgeId}",`,
    "  batch: [",
    '    "YOUR QUESTION 1",',
    '    "YOUR QUESTION 2",',
    '    "YOUR QUESTION 3",',
    "  ],",
    '  batchWebhook: "YOUR_WEBHOOK_URL",',
    "  batchVariables: [",
    '    { message: "YOUR MESSAGE" },',
    '    { name: "YOUR NAME" },',
    '    { age: "YOUR AGE" },',
    "  ],",
    "});",
    "",
    "console.log(response.batchId);",
  ].join("\n");
};

export const getGtwyJavaBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}`;
  const authKeyLine = isEmbedUser
    ? "            // No auth key required for embed users"
    : `            .authKey("YOUR_GENERATED_PAUTHKEY")`;

  return [
    "// Maven: ai.gtwy:gtwy-sdk",
    "import ai.gtwy.Gtwy;",
    "import ai.gtwy.models.BatchCompletion;",
    "import ai.gtwy.params.BatchCompletionParams;",
    "import java.util.List;",
    "import java.util.Map;",
    "",
    "public class Main {",
    "    public static void main(String[] args) {",
    "        Gtwy client = Gtwy.builder()",
    authKeyLine,
    `            .baseUrl("${baseUrl}")`,
    "            .build();",
    "",
    "        BatchCompletion response = client.batch().completions().create(",
    "            BatchCompletionParams.builder()",
    `                .agentId("${bridgeId}")`,
    "                .batch(List.of(",
    '                    "YOUR QUESTION 1",',
    '                    "YOUR QUESTION 2",',
    '                    "YOUR QUESTION 3"',
    "                ))",
    `                .batchWebhook("YOUR_WEBHOOK_URL")`,
    "                .batchVariables(List.of(",
    '                    Map.of("message", "YOUR MESSAGE"),',
    '                    Map.of("name", "YOUR NAME"),',
    '                    Map.of("age", "YOUR AGE")',
    "                ))",
    "                .build());",
    "",
    "        System.out.println(response.getBatchId());",
    "    }",
    "}",
  ].join("\n");
};

export const getGtwyPhpBatchCode = (bridgeId, isEmbedUser) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_PYTHON_SERVER_WITH_PROXY_URL}`;
  const authKeyLine = isEmbedUser
    ? "    // No auth key required for embed users"
    : `    authKey: "YOUR_GENERATED_PAUTHKEY",`;

  return [
    "<?php",
    "// composer require gtwy/gtwy-sdk",
    "require 'vendor/autoload.php';",
    "",
    "$client = new Gtwy\\Gtwy(",
    authKeyLine,
    `    baseUrl: "${baseUrl}",`,
    ");",
    "",
    "$response = $client->batch->completions->create([",
    `    'agent_id' => "${bridgeId}",`,
    "    'batch' => [",
    "        'YOUR QUESTION 1',",
    "        'YOUR QUESTION 2',",
    "        'YOUR QUESTION 3',",
    "    ],",
    "    'batch_webhook' => 'YOUR_WEBHOOK_URL',",
    "    'batch_variables' => [",
    "        ['message' => 'YOUR MESSAGE'],",
    "        ['name' => 'YOUR NAME'],",
    "        ['age' => 'YOUR AGE'],",
    "    ],",
    "]);",
    "",
    "echo $response->batchId;",
  ].join("\n");
};

export const getBatchResponseFormat = () => {
  return `{
    "success": true,
    "response": "Data will be sent on webhook within 24 Hours"
  }`;
};
