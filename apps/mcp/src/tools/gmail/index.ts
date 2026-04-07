import { utils } from '@anju/utils';

import { ToolDefinition } from '../types';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

const getAuthHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
});

export const sendEmail: ToolDefinition = {
  title: 'Gmail: Send Email',
  description: 'Send an email using Gmail',
  schema: {
    type: 'object',
    properties: {
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      cc: { type: 'string' },
      bcc: { type: 'string' }
    },
    required: ['to', 'subject', 'body']
  },
  handler: async (args, context) => {
    const credential = context.credentials[0];
    if (!credential) {
      return {
        content: [
          { type: 'text', text: 'Error: Google credential not connected' }
        ]
      };
    }

    const headers = [
      `To: ${args.to}`,
      `Subject: ${args.subject}`,
      `Content-Type: text/html; charset=utf-8`
    ];

    if (args.cc) headers.push(`Cc: ${args.cc}`);
    if (args.bcc) headers.push(`Bcc: ${args.bcc}`);

    const raw = btoa(`${headers.join('\r\n')}\r\n\r\n${args.body}`)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
      method: 'POST',
      headers: getAuthHeaders(credential.accessToken),
      body: JSON.stringify({ raw })
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: 'text', text: `Error sending email: ${error}` }]
      };
    }

    const result = await response.json();
    return {
      content: [
        {
          type: 'text',
          text: `Email sent successfully. Message ID: ${result.id}`
        }
      ]
    };
  }
};

export const listEmails: ToolDefinition = {
  title: 'Gmail: List Emails',
  description: 'List emails from Gmail inbox with optional search query',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      maxResults: { type: 'number', minimum: 1, maximum: 50 }
    }
  },
  handler: async (args, context) => {
    const credential = context.credentials[0];
    if (!credential) {
      return {
        content: [
          { type: 'text', text: 'Error: Google credential not connected' }
        ]
      };
    }

    const params = new URLSearchParams();
    if (args.query) params.set('q', String(args.query));
    params.set('maxResults', String(args.maxResults || 10));

    const response = await fetch(
      `${GMAIL_API_BASE}/messages?${params.toString()}`,
      { headers: getAuthHeaders(credential.accessToken) }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: 'text', text: `Error listing emails: ${error}` }]
      };
    }

    const data: any = await response.json();
    const messages = data.messages || [];

    if (messages.length === 0) {
      return { content: [{ type: 'text', text: 'No emails found.' }] };
    }

    const details = await Promise.all(
      messages.slice(0, 10).map(async (msg: any) => {
        const res = await fetch(
          `${GMAIL_API_BASE}/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: getAuthHeaders(credential.accessToken) }
        );
        if (!res.ok) return `- [${msg.id}] (failed to load)`;

        const detail: any = await res.json();
        const headersMap: Record<string, string> = {};
        for (const h of detail.payload?.headers || []) {
          headersMap[h.name] = h.value;
        }

        return `- From: ${headersMap['From'] || 'unknown'} | Subject: ${headersMap['Subject'] || '(no subject)'} | Date: ${headersMap['Date'] || 'unknown'} | ID: ${msg.id}`;
      })
    );

    return {
      content: [
        {
          type: 'text',
          text: `Found ${data.resultSizeEstimate || messages.length} emails:\n\n${details.join('\n')}`
        }
      ]
    };
  }
};

export const readEmail: ToolDefinition = {
  title: 'Gmail: Read Email',
  description: 'Read the full content of a specific email by message ID',
  schema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' }
    },
    required: ['messageId']
  },
  handler: async (args, context) => {
    const credential = context.credentials[0];
    if (!credential) {
      return {
        content: [
          { type: 'text', text: 'Error: Google credential not connected' }
        ]
      };
    }

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${args.messageId}?format=full`,
      { headers: getAuthHeaders(credential.accessToken) }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: 'text', text: `Error reading email: ${error}` }]
      };
    }

    const detail: any = await response.json();
    const headersMap: Record<string, string> = {};
    for (const h of detail.payload?.headers || []) {
      headersMap[h.name] = h.value;
    }

    let body = '';
    const parts = detail.payload?.parts || [];
    const textPart = parts.find(
      (p: any) => p.mimeType === utils.constants.MIMETYPE_TEXT
    );

    if (textPart?.body?.data) {
      body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (detail.payload?.body?.data) {
      body = atob(
        detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')
      );
    }

    const text = [
      `From: ${headersMap['From'] || 'unknown'}`,
      `To: ${headersMap['To'] || 'unknown'}`,
      `Subject: ${headersMap['Subject'] || '(no subject)'}`,
      `Date: ${headersMap['Date'] || 'unknown'}`,
      '',
      body || '(no text content)'
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }
};

export const searchEmails: ToolDefinition = {
  title: 'Gmail: Search Emails',
  description:
    'Search emails using Gmail search syntax (e.g. "from:user@example.com", "is:unread", "subject:hello")',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      maxResults: { type: 'number', minimum: 1, maximum: 50 }
    },
    required: ['query']
  },
  handler: async (args, context) => {
    return listEmails.handler(args, context);
  }
};

export const listLabels: ToolDefinition = {
  title: 'Gmail: List Labels',
  description: 'List all Gmail labels (folders) in the account',
  schema: {
    type: 'object',
    properties: {}
  },
  handler: async (_args, context) => {
    const credential = context.credentials[0];
    if (!credential) {
      return {
        content: [
          { type: 'text', text: 'Error: Google credential not connected' }
        ]
      };
    }

    const response = await fetch(`${GMAIL_API_BASE}/labels`, {
      headers: getAuthHeaders(credential.accessToken)
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: 'text', text: `Error listing labels: ${error}` }]
      };
    }

    const data: any = await response.json();
    const labels = (data.labels || [])
      .map((l: any) => `- ${l.name} (${l.type}) [${l.id}]`)
      .join('\n');

    return { content: [{ type: 'text', text: labels || 'No labels found.' }] };
  }
};

export const modifyLabels: ToolDefinition = {
  title: 'Gmail: Modify Labels',
  description:
    'Add or remove labels from an email (e.g. archive, mark as read/unread, move to trash)',
  schema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      addLabelIds: { type: 'string' },
      removeLabelIds: { type: 'string' }
    },
    required: ['messageId']
  },
  handler: async (args, context) => {
    const credential = context.credentials[0];
    if (!credential) {
      return {
        content: [
          { type: 'text', text: 'Error: Google credential not connected' }
        ]
      };
    }

    const addLabelIds = args.addLabelIds
      ? String(args.addLabelIds)
          .split(',')
          .map(s => s.trim())
      : [];
    const removeLabelIds = args.removeLabelIds
      ? String(args.removeLabelIds)
          .split(',')
          .map(s => s.trim())
      : [];

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${args.messageId}/modify`,
      {
        method: 'POST',
        headers: getAuthHeaders(credential.accessToken),
        body: JSON.stringify({ addLabelIds, removeLabelIds })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: 'text', text: `Error modifying labels: ${error}` }]
      };
    }

    return {
      content: [
        { type: 'text', text: `Labels updated for message ${args.messageId}` }
      ]
    };
  }
};

export const deleteEmail: ToolDefinition = {
  title: 'Gmail: Delete Email',
  description: 'Permanently delete an email by message ID (cannot be undone)',
  schema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' }
    },
    required: ['messageId']
  },
  handler: async (args, context) => {
    const credential = context.credentials[0];
    if (!credential) {
      return {
        content: [
          { type: 'text', text: 'Error: Google credential not connected' }
        ]
      };
    }

    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${args.messageId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(credential.accessToken)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: 'text', text: `Error deleting email: ${error}` }]
      };
    }

    return {
      content: [
        { type: 'text', text: `Email ${args.messageId} deleted permanently` }
      ]
    };
  }
};

export const createDraft: ToolDefinition = {
  title: 'Gmail: Create Draft',
  description: 'Create a draft email in Gmail',
  schema: {
    type: 'object',
    properties: {
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      cc: { type: 'string' },
      bcc: { type: 'string' }
    },
    required: ['to', 'subject', 'body']
  },
  handler: async (args, context) => {
    const credential = context.credentials[0];
    if (!credential) {
      return {
        content: [
          { type: 'text', text: 'Error: Google credential not connected' }
        ]
      };
    }

    const headers = [
      `To: ${args.to}`,
      `Subject: ${args.subject}`,
      `Content-Type: text/html; charset=utf-8`
    ];

    if (args.cc) headers.push(`Cc: ${args.cc}`);
    if (args.bcc) headers.push(`Bcc: ${args.bcc}`);

    const raw = btoa(`${headers.join('\r\n')}\r\n\r\n${args.body}`)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(`${GMAIL_API_BASE}/drafts`, {
      method: 'POST',
      headers: getAuthHeaders(credential.accessToken),
      body: JSON.stringify({ message: { raw } })
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: 'text', text: `Error creating draft: ${error}` }]
      };
    }

    const result: any = await response.json();
    return {
      content: [{ type: 'text', text: `Draft created. Draft ID: ${result.id}` }]
    };
  }
};
