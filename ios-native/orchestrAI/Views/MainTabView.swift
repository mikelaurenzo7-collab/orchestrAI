import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("HQ", systemImage: "house.fill")
                }
                .tag(0)
            
            AgentsView()
                .tabItem {
                    Label("Agents", systemImage: "person.3.fill")
                }
                .tag(1)
            
            ChatView()
                .tabItem {
                    Label("Chat", systemImage: "message.fill")
                }
                .tag(2)
            
            StoresView()
                .tabItem {
                    Label("Integrations", systemImage: "link")
                }
                .tag(3)
            
            SocialView()
                .tabItem {
                    Label("Broadcast", systemImage: "megaphone.fill")
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
