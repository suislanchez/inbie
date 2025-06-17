import { MCPClient } from "@mastra/mcp";

// Initialize MCP client with email processing tools
export const emailMcpClient = new MCPClient({
  servers: {
    // Sequential thinking for complex email analysis
    sequential: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    },
    // Fetch tool for web content extraction
    fetch: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-fetch"],
    },
    // Memory for context across email sessions
    memory: {
      command: "npx", 
      args: ["-y", "@modelcontextprotocol/server-memory"],
    },
  },
  timeout: 30000, // 30 second timeout
});

// Function to get available MCP toolsets
export async function getMcpToolsets() {
  try {
    return await emailMcpClient.getToolsets();
  } catch (error) {
    console.error("Failed to get MCP toolsets:", error);
    return {};
  }
}

// Function to disconnect MCP client
export async function disconnectMcp() {
  try {
    await emailMcpClient.disconnect();
  } catch (error) {
    console.error("Error disconnecting MCP client:", error);
  }
} 