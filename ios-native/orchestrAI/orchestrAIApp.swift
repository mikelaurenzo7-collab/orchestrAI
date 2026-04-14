import SwiftUI

@main
struct orchestrAIApp: App {
    @State private var authService = AuthService.shared
    @State private var showSplash = true
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                Group {
                    if authService.isAuthenticated {
                        MainTabView()
                    } else {
                        AuthView()
                    }
                }
                .environment(authService)
                .opacity(showSplash ? 0 : 1)
                
                if showSplash {
                    SplashView()
                        .transition(.opacity)
                }
            }
            .preferredColorScheme(.dark)
            .task {
                await authService.checkAuthStatus()
                try? await Task.sleep(for: .seconds(1.8))
                withAnimation(.easeOut(duration: 0.6)) {
                    showSplash = false
                }
            }
        }
    }
}

// MARK: - Splash Screen

struct SplashView: View {
    @State private var logoScale: CGFloat = 0.7
    @State private var logoOpacity: Double = 0
    @State private var textOpacity: Double = 0
    @State private var ringScale: CGFloat = 0.5
    @State private var ringOpacity: Double = 0
    @State private var taglineOpacity: Double = 0
    
    var body: some View {
        ZStack {
            Theme.bgPrimary.hexColor.ignoresSafeArea()
            
            // Subtle ambient glow
            AmbientOrb(color: Theme.emerald.hexColor, size: 300)
                .offset(y: -50)
                .opacity(0.3)
            
            VStack(spacing: 24) {
                ZStack {
                    // Outer pulse ring
                    Circle()
                        .stroke(Theme.emerald.hexColor.opacity(0.15), lineWidth: 1.5)
                        .frame(width: 120, height: 120)
                        .scaleEffect(ringScale)
                        .opacity(ringOpacity)
                    
                    // Inner glow
                    Circle()
                        .fill(Theme.emerald.hexColor.opacity(0.06))
                        .frame(width: 90, height: 90)
                    
                    Circle()
                        .stroke(Theme.emerald.hexColor.opacity(0.3), lineWidth: 1)
                        .frame(width: 90, height: 90)
                    
                    Image(systemName: "brain.filled.head.profile")
                        .font(.system(size: 42, weight: .light))
                        .foregroundStyle(Theme.emerald.hexColor)
                }
                .scaleEffect(logoScale)
                .opacity(logoOpacity)
                
                VStack(spacing: 10) {
                    Text("orchestrAI")
                        .font(.custom(Theme.FontWeight.light, size: 38))
                        .foregroundStyle(.white)
                        .tracking(-1.5)
                        .opacity(textOpacity)
                    
                    Text("Conduct your commerce symphony")
                        .font(.custom(Theme.FontWeight.bodyRegular, size: 14))
                        .foregroundStyle(Theme.textSecondary.hexColor)
                        .opacity(taglineOpacity)
                }
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.65)) {
                logoScale = 1.0
                logoOpacity = 1.0
            }
            withAnimation(.easeOut(duration: 1.0).delay(0.15)) {
                ringScale = 1.0
                ringOpacity = 1.0
            }
            withAnimation(.easeIn(duration: 0.5).delay(0.4)) {
                textOpacity = 1.0
            }
            withAnimation(.easeIn(duration: 0.5).delay(0.6)) {
                taglineOpacity = 1.0
            }
        }
    }
}
