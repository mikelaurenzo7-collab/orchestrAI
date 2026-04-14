import Foundation
import SwiftUI

// MARK: - Dashboard ViewModel

@MainActor
@Observable
class DashboardViewModel {
    var metrics: DashboardMetrics?
    var isLoading = false
    var error: String?
    
    private let apiClient = APIClient.shared
    
    func fetchDashboard() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            metrics = try await apiClient.request("/api/dashboard")
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Agents ViewModel

@MainActor
@Observable
class AgentsViewModel {
    var agents: [Agent] = []
    var isLoading = false
    var error: String?
    var selectedCategory: String? = nil
    
    private let apiClient = APIClient.shared
    
    var filteredAgents: [Agent] {
        guard let category = selectedCategory else { return agents }
        return agents.filter { $0.category == category }
    }
    
    var categories: [String] {
        Array(Set(agents.map(\.category))).sorted()
    }
    
    func fetchAgents() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            agents = try await apiClient.request("/api/agents")
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    func toggleAgent(id: String, isActive: Bool) async {
        let update = AgentUpdate(personality: nil, tone: nil, autoExecute: nil, isActive: isActive)
        do {
            try await apiClient.requestNoResponse("/api/agents/\(id)", method: .PATCH, body: update)
            if let i = agents.firstIndex(where: { $0.id == id }) {
                // Optimistic update — toggle locally before refetching
                await fetchAgents()
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Chat ViewModel

@MainActor
@Observable
class ChatViewModel {
    var messages: [ChatMessage] = []
    var isLoading = false
    var isSending = false
    var error: String?
    var selectedAgentType: String = "general"
    
    private let apiClient = APIClient.shared
    
    func sendMessage(_ content: String) async {
        let userMessage = ChatMessage(role: "user", content: content, agentType: selectedAgentType)
        messages.append(userMessage)
        
        isSending = true
        defer { isSending = false }
        
        let request = ChatRequest(message: content, agentType: selectedAgentType)
        
        do {
            let response: ChatResponse = try await apiClient.request("/api/chat", method: .POST, body: request)
            let reply = response.reply ?? response.response ?? "I'm processing your request. Please try again shortly."
            let assistantMessage = ChatMessage(role: "assistant", content: reply, agentType: selectedAgentType)
            messages.append(assistantMessage)
        } catch {
            let errorMsg = ChatMessage(role: "assistant", content: "Connection interrupted. Please check your network and try again.", agentType: selectedAgentType)
            messages.append(errorMsg)
            self.error = error.localizedDescription
        }
    }
    
    func switchAgent(to agentType: String) {
        selectedAgentType = agentType
        messages.removeAll()
        initializeChat()
    }
    
    func initializeChat() {
        let greetings: [String: String] = [
            "general": "Welcome to orchestrAI. I'm your central command — ask me anything about your business operations.",
            "shopify": "Shopify Executive Assistant ready. I can manage products, analyze orders, optimize your store, and handle inventory.",
            "marketing_suite": "Marketing Suite online. I'll craft campaigns, generate copy, schedule social posts, and analyze engagement across all channels.",
            "analytics": "Data Analytics engine active. Ask me about revenue trends, customer insights, conversion funnels, or performance forecasts.",
            "email": "Communications Executive here. I can draft emails, manage templates, set up drip campaigns, and optimize deliverability.",
            "crm": "CRM Specialist standing by. I'll help with customer segmentation, lead scoring, pipeline management, and retention strategies.",
            "finance": "CFO AI reporting for duty. I can handle budgets, financial forecasting, P&L analysis, and cash flow optimization.",
            "legal": "Compliance AI activated. I'll assist with policy reviews, terms of service, regulatory checks, and contract analysis."
        ]
        
        let greeting = greetings[selectedAgentType] ?? greetings["general"]!
        let welcomeMessage = ChatMessage(role: "assistant", content: greeting, agentType: selectedAgentType)
        messages = [welcomeMessage]
    }
}

// MARK: - Stores ViewModel

@MainActor
@Observable
class StoresViewModel {
    var stores: [Store] = []
    var isLoading = false
    var error: String?
    
    private let apiClient = APIClient.shared
    
    var activeStores: Int { stores.filter { $0.status == "active" }.count }
    var totalRevenue: Double { stores.reduce(0) { $0 + $1.revenue } }
    
    func fetchStores() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            stores = try await apiClient.request("/api/stores")
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    func createStore(name: String, platform: String, apiKey: String?, storeUrl: String?) async {
        let request = StoreCreateRequest(name: name, platform: platform, apiKey: apiKey, storeUrl: storeUrl)
        do {
            try await apiClient.requestNoResponse("/api/stores", method: .POST, body: request)
            await fetchStores()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Social ViewModel

@MainActor
@Observable
class SocialViewModel {
    var posts: [SocialPost] = []
    var isLoading = false
    var error: String?
    
    private let apiClient = APIClient.shared
    
    var publishedPosts: [SocialPost] { posts.filter { $0.status == "published" } }
    var scheduledPosts: [SocialPost] { posts.filter { $0.status == "scheduled" } }
    var draftPosts: [SocialPost] { posts.filter { $0.status == "draft" } }
    
    func fetchPosts() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            posts = try await apiClient.request("/api/social/posts")
        } catch {
            self.error = error.localizedDescription
            posts = [mockPost]
        }
    }
    
    private var mockPost: SocialPost {
        SocialPost(
            id: "demo-1",
            content: "Just launched our new automated compliance tracking features. 🚀\n\nSave your team 40+ hours a month by letting orchestrAI handle vendor vetting, marketing campaigns, and inventory management — all autonomously.\n\nSign up for early access today! 👇",
            platforms: ["twitter", "linkedin"],
            status: "published",
            scheduledFor: nil,
            createdAt: ISO8601DateFormatter().string(from: Date()),
            metrics: PostMetrics(likes: 2400, clicks: 850, shares: 140)
        )
    }
}
