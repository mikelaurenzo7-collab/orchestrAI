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
    
    private let apiClient = APIClient.shared
    
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
            await fetchAgents()
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
    
    private let apiClient = APIClient.shared
    
    func sendMessage(_ content: String, agentType: String) async {
        let userMessage = ChatMessage(role: "user", content: content, agentType: agentType)
        messages.append(userMessage)
        
        isSending = true
        defer { isSending = false }
        
        let request = ChatRequest(message: content, agentType: agentType)
        
        do {
            let response: ChatResponse = try await apiClient.request("/api/chat", method: .POST, body: request)
            let assistantReply = response.reply ?? response.response ?? "No response"
            let assistantMessage = ChatMessage(role: "assistant", content: assistantReply, agentType: agentType)
            messages.append(assistantMessage)
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    func initializeChat(for agentType: String) {
        let welcomeMessage = ChatMessage(
            role: "assistant",
            content: "How can I assist you with your workspace operations today?",
            agentType: agentType
        )
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
    
    func fetchPosts() async {
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            posts = try await apiClient.request("/api/social/posts")
        } catch {
            self.error = error.localizedDescription
            // Fallback to mock data for demo
            posts = [mockPost]
        }
    }
    
    private var mockPost: SocialPost {
        SocialPost(
            id: "1",
            content: "Just launched our new automated compliance tracking features. 🚀\n\nSave your team 40+ hours a month by letting orchestrAI handle vendor vetting. Sign up for early access today! 👇",
            platforms: ["twitter", "linkedin"],
            status: "published",
            scheduledFor: nil,
            createdAt: ISO8601DateFormatter().string(from: Date()),
            metrics: PostMetrics(likes: 2400, clicks: 850, shares: 140)
        )
    }
}
