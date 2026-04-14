import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    @Environment(AuthService.self) private var authService
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .environment(authService)
                .tabItem {
                    Label("HQ", systemImage: selectedTab == 0 ? "house.fill" : "house")
                }
                .tag(0)
            
            AgentsView()
                .tabItem {
                    Label("Agents", systemImage: selectedTab == 1 ? "cpu.fill" : "cpu")
                }
                .tag(1)
            
            ChatView()
                .tabItem {
                    Label("Chat", systemImage: selectedTab == 2 ? "message.fill" : "message")
                }
                .tag(2)
            
            StoresView()
                .tabItem {
                    Label("Integrations", systemImage: selectedTab == 3 ? "link.circle.fill" : "link.circle")
                }
                .tag(3)
            
            SocialView()
                .tabItem {
                    Label("Broadcast", systemImage: selectedTab == 4 ? "megaphone.fill" : "megaphone")
                }
                .tag(4)
        }
        .tint(Theme.emerald.hexColor)
        .sensoryFeedback(.selection, trigger: selectedTab)
    }
}

#Preview {
    MainTabView()
        .environment(AuthService.shared)
}
