import Foundation

// MARK: - User & Auth Models

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let role: String
    let createdAt: String
    let trialEndsAt: String?
    let subscriptionStatus: String?
    
    enum CodingKeys: String, CodingKey {
        case id, email, name, role
        case createdAt = "created_at"
        case trialEndsAt = "trial_ends_at"
        case subscriptionStatus = "subscription_status"
    }
}

struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: User
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let name: String
}

// MARK: - Dashboard Models

struct DashboardMetrics: Codable {
    let totalStores: Int
    let activeAgents: Int
    let tasksCompleted: Int
    let totalRevenue: Double
    let totalOrders: Int
    let socialPosts: Int
    let recentActivity: [ActivityItem]
    
    enum CodingKeys: String, CodingKey {
        case totalStores = "total_stores"
        case activeAgents = "active_agents"
        case tasksCompleted = "tasks_completed"
        case totalRevenue = "total_revenue"
        case totalOrders = "total_orders"
        case socialPosts = "social_posts"
        case recentActivity = "recent_activity"
    }
}

struct ActivityItem: Codable, Identifiable {
    let id = UUID()
    let type: String
    let message: String
    let timestamp: String
    
    enum CodingKeys: String, CodingKey {
        case type, message, timestamp
    }
}

// MARK: - Agent Models

struct Agent: Codable, Identifiable {
    let id: String
    let name: String
    let agentType: String
    let description: String
    let category: String
    let personality: String
    let tone: String
    let autoExecute: Bool
    let isActive: Bool
    let storeId: String?
    let capabilities: [String]
    let tasksCompleted: Int
    let lastActive: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, category, personality, tone, capabilities
        case agentType = "agent_type"
        case autoExecute = "auto_execute"
        case isActive = "is_active"
        case storeId = "store_id"
        case tasksCompleted = "tasks_completed"
        case lastActive = "last_active"
    }
}

struct AgentUpdate: Codable {
    let personality: String?
    let tone: String?
    let autoExecute: Bool?
    let isActive: Bool?
    
    enum CodingKeys: String, CodingKey {
        case personality, tone
        case autoExecute = "auto_execute"
        case isActive = "is_active"
    }
}

// MARK: - Chat Models

struct ChatMessage: Codable, Identifiable {
    let id: String
    let role: String  // "user" | "assistant"
    let content: String
    let timestamp: String
    let agentType: String?
    
    enum CodingKeys: String, CodingKey {
        case id, role, content, timestamp
        case agentType = "agent_type"
    }
    
    init(id: String = UUID().uuidString, role: String, content: String, timestamp: String = ISO8601DateFormatter().string(from: Date()), agentType: String? = nil) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
        self.agentType = agentType
    }
}

struct ChatRequest: Codable {
    let message: String
    let agentType: String
    
    enum CodingKeys: String, CodingKey {
        case message
        case agentType = "agent_type"
    }
}

struct ChatResponse: Codable {
    let reply: String?
    let response: String?
}

// MARK: - Store Models

struct Store: Codable, Identifiable {
    let id: String
    let name: String
    let platform: String
    let storeUrl: String?
    let status: String  // "active" | "error" | "pending"
    let connectedAt: String
    let productsSynced: Int
    let ordersTotal: Int
    let revenue: Double
    let mode: String  // "autonomous" | "copilot" | "observe"
    let spendingCap: Double
    
    enum CodingKeys: String, CodingKey {
        case id, name, platform, status, revenue, mode
        case storeUrl = "store_url"
        case connectedAt = "connected_at"
        case productsSynced = "products_synced"
        case ordersTotal = "orders_total"
        case spendingCap = "spending_cap"
    }
}

struct StoreCreateRequest: Codable {
    let name: String
    let platform: String
    let apiKey: String?
    let storeUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case name, platform
        case apiKey = "api_key"
        case storeUrl = "store_url"
    }
}

// MARK: - Social Models

struct SocialPost: Codable, Identifiable {
    let id: String
    let content: String
    let platforms: [String]
    let status: String  // "draft" | "published" | "scheduled"
    let scheduledFor: String?
    let createdAt: String
    let metrics: PostMetrics?
    
    enum CodingKeys: String, CodingKey {
        case id, content, platforms, status, metrics
        case scheduledFor = "scheduled_for"
        case createdAt = "created_at"
    }
}

struct PostMetrics: Codable {
    let likes: Int
    let clicks: Int
    let shares: Int
}

// MARK: - Error Response
struct APIError: Codable {
    let detail: String
}
