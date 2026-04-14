import Foundation
import SwiftUI
import Security

// MARK: - Auth Service

@MainActor
@Observable
class AuthService {
    static let shared = AuthService()
    
    var isAuthenticated = false
    var currentUser: User?
    var isLoading = false
    var error: String?
    
    private let apiClient = APIClient.shared
    private let keychainService = "com.orchestrai.app"
    
    private init() {}
    
    // MARK: - Public Methods
    
    func checkAuthStatus() async {
        if let token = loadToken() {
            apiClient.setAccessToken(token)
            do {
                let user: User = try await apiClient.request("/api/auth/me")
                self.currentUser = user
                self.isAuthenticated = true
            } catch {
                clearToken()
                self.isAuthenticated = false
            }
        }
    }
    
    func login(email: String, password: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let request = LoginRequest(email: email, password: password)
        let response: AuthResponse = try await apiClient.request("/api/auth/login", method: .POST, body: request)
        
        saveToken(response.accessToken)
        apiClient.setAccessToken(response.accessToken)
        currentUser = response.user
        isAuthenticated = true
    }
    
    func register(name: String, email: String, password: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let request = RegisterRequest(email: email, password: password, name: name)
        let response: AuthResponse = try await apiClient.request("/api/auth/register", method: .POST, body: request)
        
        saveToken(response.accessToken)
        apiClient.setAccessToken(response.accessToken)
        currentUser = response.user
        isAuthenticated = true
    }
    
    func logout() {
        clearToken()
        apiClient.setAccessToken(nil)
        currentUser = nil
        isAuthenticated = false
    }
    
    // MARK: - Keychain
    
    private func saveToken(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: "accessToken",
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    private func loadToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: "accessToken",
            kSecReturnData as String: true
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else { return nil }
        return token
    }
    
    private func clearToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: "accessToken"
        ]
        SecItemDelete(query as CFDictionary)
    }
}
