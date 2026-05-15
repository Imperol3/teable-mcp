# teable-mcp

Full-CRUD MCP server for [Teable](https://teable.io) — zero build step, `npx`-ready.

## Quick Start

### 1. Get your API token

Teable → Settings → Personal Access Token → Create token

Enable scopes: **Read** `space, base, table, record, view, field` · **Write** `record, field, table, view`

### 2. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "teable": {
      "command": "npx",
      "args": ["-y", "teable-mcp"],
      "env": {
        "TEABLE_API_KEY": "your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop. Done.

### Self-hosted Teable

Add `TEABLE_BASE_URL` to point at your instance:

```json
{
  "mcpServers": {
    "teable": {
      "command": "npx",
      "args": ["-y", "teable-mcp"],
      "env": {
        "TEABLE_API_KEY": "your_token_here",
        "TEABLE_BASE_URL": "https://your-teable.example.com/api"
      }
    }
  }
}
```

---

## Why this over the community server?

| Feature | `ltphat2204` | `teable-mcp` |
|---|---|---|
| Setup | Clone → build → configure path | `npx teable-mcp` |
| Create records | ❌ | ✅ |
| Update records | ❌ | ✅ |
| Delete records | ❌ | ✅ |
| Batch operations | ❌ | ✅ (up to 2000 records) |
| Schema management | ❌ | ✅ |
| Table management | ❌ | ✅ |
| View management | ❌ | ✅ |
| Published on npm | ❌ | ✅ |

---

## Tools (23 total)

### Discovery
| Tool | Description |
|---|---|
| `list_spaces` | All spaces the API key can access |
| `list_bases` | All bases in a space |
| `list_tables` | All tables in a base |
| `get_table_schema` | Full field definitions — call before writing records |
| `list_views` | All views in a table |

### Records — Read
| Tool | Description |
|---|---|
| `get_records` | Fetch with filter, sort, search, pagination, field projection |
| `get_record` | Single record by ID |
| `get_record_history` | Full audit trail for a record |

### Records — Write
| Tool | Description |
|---|---|
| `create_records` | Create 1–2000 records, with typecast |
| `update_record` | PATCH a single record (only changed fields) |
| `update_records` | Batch update multiple records |
| `delete_records` | Delete one or more records by ID |

### Schema Management
| Tool | Description |
|---|---|
| `create_field` | Add a field (text, number, select, date, checkbox, formula…) |
| `update_field` | Rename or update field options |
| `delete_field` | Remove a field permanently |

### Base Management
| Tool | Description |
|---|---|
| `create_base` | Create a new base in a space |
| `delete_base` | Delete a base permanently |

### Table Management
| Tool | Description |
|---|---|
| `create_table` | Create a new table, optionally with initial fields |
| `update_table` | Rename or update a table |
| `delete_table` | Move table to trash (recoverable) |

### View Management
| Tool | Description |
|---|---|
| `create_view` | Create grid, gallery, kanban, calendar, gantt, or form view |
| `update_view` | Rename or update a view |
| `delete_view` | Remove a view |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TEABLE_API_KEY` | ✅ | — | Personal Access Token from Teable settings |
| `TEABLE_BASE_URL` | ❌ | `https://app.teable.io/api` | Override for self-hosted instances |

---

## Debugging with MCP Inspector

```bash
TEABLE_API_KEY=your_token npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Local Development

```bash
git clone https://github.com/yourname/teable-mcp
cd teable-mcp
npm install
npm run build

TEABLE_API_KEY=your_token node dist/index.js
```

---

## License

MIT
