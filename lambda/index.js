import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "Clues";

/**
 * CORS Headers
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Lambda handler for POST /answer
 * Expected body: { clueId: string, answer: string }
 * Response: { correct: boolean, nextClueId: string|null, message?: string }
 */
export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const method =
    event.httpMethod ||
    event.requestContext?.http?.method ||
    event.requestContext?.httpMethod;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "OK" }),
    };
  }

  // Support GET /clue?id=... to fetch a clue, and POST /answer to validate
  if (method === "GET") {
    // Get clue id from query string
    const id = event.queryStringParameters?.id || event.query?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing required query parameter: id" }),
      };
    }

    try {
      const result = await docClient.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { id } })
      );
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Clue not found" }),
        };
      }

      const clue = result.Item;
      // Return only public fields (don't expose correctAnswer)
      const publicClue = {
        id: clue.id,
        question: clue.question,
        choices: clue.choices,
        nextClueId: clue.nextClueId || null,
        hint: clue.hint || null,
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(publicClue),
      };
    } catch (err) {
      console.error('Error fetching clue:', err);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Internal server error', message: err.message }),
      };
    }
  }

  try {
    // Parse request body
    let body;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      body = event.body;
    }

    const { clueId, answer } = body;

    // Validate input
    if (!clueId || !answer) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing required fields: clueId and answer",
        }),
      };
    }

    console.log(`Validating answer for clueId=${clueId}, answer=${answer}`);

    // Query DynamoDB for the clue
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: clueId },
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Clue not found" }),
      };
    }

    const clue = result.Item;
    const isCorrect = clue.correctAnswer === answer;

    console.log(
      `Clue found. Expected: ${clue.correctAnswer}, Received: ${answer}, Correct: ${isCorrect}`
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        correct: isCorrect,
        nextClueId: isCorrect ? clue.nextClueId : null,
        message: isCorrect ? "Correct!" : "Try again!",
        hint: isCorrect ? (clue.hint || null) : null,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
