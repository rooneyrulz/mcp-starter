import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";

const server = new McpServer({
  name: "sample-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {
      "todos": {
        description: "A list of all todos",
        mimeType: "application/json",
      },
    },
    tools: {},
    prompts: {},
  },
});

// Register the todos resource
server.registerResource("todos", "todos://all", {
  title: "All Todos",
  description: "A list of all todos",
  mimeType: "application/json",
}, async (uri) => {
  try {
    const todos = await import("./data/todos.json", {
      with: { type: "json" },
    }).then((module) => module.default);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(todos, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to load todos: ${(error as Error).message}`);
  }
});

// tools
server.registerTool(
  "new-todo",
  {
    title: "New Todo Tool",
    description: "Create a new todo in the todo list.",
    inputSchema: {
      title: z.string(),
      description: z.string(),
      author: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      dueDate: z.string(),
    }
  },
  async (input) => {
    try {
      const todo = await createTodo(input);
      return {
        content: [
          {
            type: "text",
            text: `Created todo: ${JSON.stringify(todo)}`,
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              (error as Error).message ||
              "An error occurred while creating the todo.",
          },
        ],
      };
    }
  }
);

async function createTodo(input: any) {
  const todos = await import("./data/todos.json", {
    with: { type: "json" },
  }).then((module) => module.default);

  const todo = {
    title: input.title,
    description: input.description,
    author: input.author,
    priority: input.priority,
    dueDate: input.dueDate,
  };
  todos.push(todo);
  await fs.writeFile("./src/data/todos.json", JSON.stringify(todos, null, 2));
  return todo;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
