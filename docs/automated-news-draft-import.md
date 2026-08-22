# Automated news draft import

External automations can create reviewable news drafts through a dedicated
server-to-server endpoint. The endpoint cannot publish, feature, archive, edit,
or delete articles.

## Endpoint

`POST /api/automation/news/drafts`

Required headers:

```http
Authorization: Bearer <ARTICLE_IMPORT_API_KEY>
Content-Type: application/json
```

`ARTICLE_IMPORT_API_KEY` is a dedicated secret for this endpoint. Do not use the
public analytics API key, a user session cookie, or an editor/admin credential.

## Request body

The JSON object accepts only the fields below. Unknown fields are rejected.

| Field | Required | Limits and format |
| --- | --- | --- |
| `externalId` | Yes | 1–128 characters. Must start with a letter or number; remaining characters may be letters, numbers, `.`, `_`, `:`, or `-`. Use a stable unique ID from the automation. |
| `title` | Yes | 5–250 characters after trimming. |
| `content` | Yes | HTML string, 1–80,000 characters. Unsafe tags, attributes, and URL schemes are removed. Content that is empty after sanitization is rejected. |
| `excerpt` | No | Up to 1,000 characters after trimming. |
| `coverImageUrl` | Yes | Valid HTTPS URL, up to 2,048 characters. The server stores this URL but does not fetch it. |
| `sourceLinks` | Yes | Array of 1–20 source objects. Each object must contain only `name` and `url`. `name` is 1–160 characters after trimming; `url` is a valid HTTPS URL up to 2,048 characters. |
| `categorySlugs` | Yes | Array of 1–5 unique, active category slugs. Each slug is 1–100 characters in lowercase kebab-case, such as `audit` or `financial-reporting`. |

The server sanitizes the submitted HTML and appends a standard Sources section
from `sourceLinks`. The first source is also stored in the article's existing
primary source fields for editor compatibility.

The server always overrides article state to:

- `status: "draft"`
- no publication timestamp
- not archived
- not featured
- no automation-supplied author

The automation cannot submit any of those fields because unknown request fields
are rejected.

## Example request

Use placeholders only in shared scripts or documentation:

```bash
curl --request POST "https://<YOUR_DOMAIN>/api/automation/news/drafts" \
  --header "Authorization: Bearer <ARTICLE_IMPORT_API_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "externalId": "<STABLE_AUTOMATION_ARTICLE_ID>",
    "title": "<ARTICLE_HEADLINE>",
    "content": "<p>ARTICLE_HTML</p>",
    "excerpt": "<SHORT_EXCERPT>",
    "coverImageUrl": "https://<IMAGE_HOST>/<IMAGE_PATH>",
    "sourceLinks": [
      {
        "name": "<SOURCE_NAME>",
        "url": "https://<SOURCE_HOST>/<SOURCE_PATH>"
      }
    ],
    "categorySlugs": ["<ACTIVE_CATEGORY_SLUG>"]
  }'
```

## Success responses

New draft: `201 Created`

Exact retry of an already accepted `externalId`: `200 OK`

```json
{
  "id": "<ARTICLE_ID>",
  "externalId": "<STABLE_AUTOMATION_ARTICLE_ID>",
  "status": "draft",
  "reviewPath": "/news/<ARTICLE_ID>/edit",
  "created": true
}
```

For an exact retry, `created` is `false` and the existing draft is returned.
Retries do not create duplicate articles.

## Error responses

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | Invalid fields, unknown fields, inactive/unknown categories, unsafe content that becomes empty, or another request validation failure. |
| `401 Unauthorized` | Missing, malformed, or incorrect Bearer credential. |
| `409 Conflict` | The `externalId` already exists, but the normalized article content differs from the original accepted request. Use a new `externalId` for a different article. |
| `415 Unsupported Media Type` | `Content-Type` is not `application/json`. |
| `429 Too Many Requests` | More than 10 requests were attempted from the same IP address within one minute. |
| `500 Internal Server Error` | The draft could not be imported because of an unexpected server or database error. |
| `503 Service Unavailable` | `ARTICLE_IMPORT_API_KEY` is missing or shorter than 32 characters on the server. |

Error bodies contain a `message`. Validation errors may also include field-level
`errors`, and category errors include `invalidCategorySlugs`.

## Review and publication

Open the returned `reviewPath` while signed in as an editor or administrator.
Review and edit the draft through the existing article editor, then publish it
manually. Draft and archived article detail endpoints return `404` to the public,
and crawlers receive a non-indexable `404`.