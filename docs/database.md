# Database Design

NexusOps uses **PostgreSQL 16** with the **pgvector** extension for vector similarity search, accessed via the **Prisma ORM**.

## Schema Overview

```mermaid
erDiagram
    User ||--o{ UserRole : has
    Role ||--o{ UserRole : has
    User ||--o{ Incident : reports
    User ||--o{ Incident : assigned_to
    Incident ||--o{ IncidentComment : has
    Incident ||--o{ IncidentHistory : has
    Incident ||--o{ IncidentAttachment : has
    Incident ||--o{ ProblemIncident : linked
    Asset ||--o{ Incident : related
    Asset ||--o{ AssetAssignment : has_history
    KnowledgeArticle ||--o{ KnowledgeEmbedding : has
    Problem ||--o{ ProblemIncident : links
    Change ||--o{ ChangeApproval : has
    User ||--o{ Notification : receives
    User ||--o{ AuditLog : generates
    User ||--o{ AiInteraction : triggers

    User {
        id UUID PK
        email VARCHAR UNIQUE
        passwordHash VARCHAR
        fullName VARCHAR
        isActive BOOLEAN
        lastLoginAt TIMESTAMP
    }
    Incident {
        id UUID PK
        ref VARCHAR UNIQUE
        title VARCHAR
        status ENUM
        priority ENUM
        category ENUM
        responseDeadline TIMESTAMP
        resolutionDeadline TIMESTAMP
        slaBreached BOOLEAN
    }
    Asset {
        id UUID PK
        assetTag VARCHAR UNIQUE
        type ENUM
        status ENUM
        serialNumber VARCHAR UNIQUE
    }
    KnowledgeArticle {
        id UUID PK
        slug VARCHAR UNIQUE
        title VARCHAR
        status ENUM
        tags TEXT[]
    }
    KnowledgeEmbedding {
        articleId FK
        embedding vector(768)
    }
    Problem {
        id UUID PK
        ref VARCHAR UNIQUE
        rootCause TEXT
        status ENUM
    }
    Change {
        id UUID PK
        ref VARCHAR UNIQUE
        status ENUM
        risk ENUM
        rollbackPlan TEXT
    }
    Notification {
        id UUID PK
        type VARCHAR
        isRead BOOLEAN
    }
    AuditLog {
        id UUID PK
        action VARCHAR
        metadata JSONB
        ipAddress INET
    }
    AiInteraction {
        id UUID PK
        type ENUM
        output JSONB
        accepted BOOLEAN
    }
```

## Core Tables

### User Management
- **roles** — ADMIN, IT_MANAGER, TECHNICIAN, EMPLOYEE with granular permissions (JSONB)
- **users** — authentication profile, bcrypt password hash, account status
- **user_roles** — many-to-many join (supports multiple roles per user)
- **departments** — organizational units
- **user_departments** — membership with primary flag

### Incident Management
- **incidents** — core ticket entity with status, priority, category, SLA deadlines, breach flag
- **incident_comments** — threaded discussion with internal/public visibility
- **incident_history** — immutable field-level change trail (old→new)
- **incident_attachments** — file metadata linked to incidents
- **sla_policies** — per-priority response/resolution time targets

### Asset Management
- **assets** — IT equipment with type, status, assignment, warranty tracking
- **asset_assignments** — reassignment history audit trail

### Knowledge Base
- **knowledge_articles** — structured articles with workflow status, tags (GIN indexed)
- **knowledge_embeddings** — chunked article embeddings for RAG retrieval

### Problem & Change Management
- **problems** — root cause tracking with workaround and permanent fix
- **problem_incidents** — links incidents to their underlying problem
- **changes** — ITIL-style change workflow with risk, impact, rollback plan
- **change_approvals** — approval decision history

### System
- **notifications** — user notification queue with read state
- **audit_logs** — INSERT-only security audit trail with IP and user-agent
- **ai_interactions** — AI input/output storage with accept/reject tracking
- **refresh_tokens** — JWT refresh token rotation and revocation

## Enumerations

| Enum | Values |
|---|---|
| IncidentStatus | OPEN, ASSIGNED, IN_PROGRESS, WAITING_FOR_USER, WAITING_FOR_VENDOR, RESOLVED, CLOSED, REOPENED |
| IncidentPriority | LOW, MEDIUM, HIGH, CRITICAL |
| IncidentCategory | NETWORK, HARDWARE, SOFTWARE, SECURITY, ACCOUNT, EMAIL, SERVER, DATABASE, VPN, OTHER |
| AssetType | LAPTOP, DESKTOP, MONITOR, PRINTER, ROUTER, SERVER, MOBILE_DEVICE, NETWORK_DEVICE |
| ArticleStatus | DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED |
| ChangeStatus | DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, SCHEDULED, IMPLEMENTING, COMPLETED, REJECTED |
| AiInteractionType | CLASSIFY, SUMMARIZE, DUPLICATE_CHECK, RAG_ANSWER |

## Indexing Strategy

| Index | Purpose |
|---|---|
| `incidents(assigneeId, status)` | Technician workload queries |
| `incidents(status, priority)` | Dashboard filtering |
| `incidents(createdAt)` | Chronological sorting |
| `incidents(ref)` | Ticket lookup by reference |
| `notifications(userId, isRead)` | Unread count queries |
| `knowledge_articles(tags)` GIN | Tag-based filtering |
| `knowledge_embeddings(embedding)` HNSW | Vector similarity search |
| `audit_logs(action, createdAt)` | Audit review filtering |

## Migrations

Prisma Migrate manages all schema changes. The initial migration includes:
- `CREATE EXTENSION vector` — enables pgvector
- All tables, enums, constraints, indexes
- Foreign key cascades where appropriate

```bash
cd backend
npx prisma migrate dev        # dev migration
npx prisma migrate deploy     # production migration
```

## Seed Data

The seed script populates realistic demo data:
- 6 users across all roles
- 5 departments
- 4 SLA policies (one per priority)
- 8 assets with assignment history
- 6 incidents in various states
- 1 problem with linked incidents
- 1 change request
- 3 knowledge articles
- Notifications and audit logs
