import SwiftUI

@main
struct orchestrAIApp: App {
    @StateObject private var authService = AuthService.shared
    @State private var networkMonitor = NetworkMonitor()
    
    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isAuthenticated {
                    MainTabView()
                        .environment(authService)
                } else {
                    AuthView()
                        .environment(authService)
                }
            }
            .task {
                await authService.checkAuthStatus()
            }
        }
    }
}
