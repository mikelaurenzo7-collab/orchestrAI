import SwiftUI

struct AuthView: View {
    @Environment(AuthService.self) private var authService
    @State private var isLogin = true
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var showError = false
    @State private var errorMessage = ""
    
    @Namespace private var animation
    
    var body: some View {
        ZStack {
            // Background
            Theme.bgPrimary.hexColor
                .ignoresSafeArea()
            
            // Floating Orbs Background
            FloatingOrbsView()
            
            // Content
            ScrollView {
                VStack(spacing: 32) {
                    Spacer()
                        .frame(height: 60)
                    
                    // Logo & Title
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Theme.emerald.hexColor.opacity(0.1))
                                .frame(width: 80, height: 80)
                            
                            Image(systemName: "brain.filled.head.profile")
                                .font(.system(size: 36, weight: .light))
                                .foregroundStyle(Theme.emerald.hexColor)
                        }
                        
                        Text("orchestrAI")
                            .font(.custom(Theme.FontWeight.light, size: 42))
                            .foregroundStyle(Theme.textPrimary.hexColor)
                            .tracking(-1)
                        
                        Text("Supercharge your workforce with autonomous AI agents.")
                            .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                            .foregroundStyle(Theme.textSecondary.hexColor)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 24)
                    
                    // Auth Card
                    VStack(spacing: 20) {
                        if !isLogin {
                            CustomTextField(
                                icon: "person.fill",
                                placeholder: "Full Name",
                                text: $name
                            )
                            .matchedGeometryEffect(id: "nameField", in: animation)
                        }
                        
                        CustomTextField(
                            icon: "envelope.fill",
                            placeholder: "Email Address",
                            text: $email,
                            keyboardType: .emailAddress,
                            autocapitalization: .never
                        )
                        
                        CustomTextField(
                            icon: "lock.fill",
                            placeholder: "Password",
                            text: $password,
                            isSecure: true
                        )
                        
                        Button {
                            Task {
                                await handleSubmit()
                            }
                        } label: {
                            HStack(spacing: 8) {
                                if authService.isLoading {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                        .tint(.white)
                                } else {
                                    Text(isLogin ? "Sign In" : "Create Account")
                                        .font(.custom(Theme.FontWeight.bold, size: 18))
                                    
                                    Image(systemName: "arrow.right")
                                        .font(.system(size: 16, weight: .bold))
                                }
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 64)
                            .background(Theme.emerald.hexColor)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .disabled(authService.isLoading)
                        .sensoryFeedback(.impact(weight: .heavy), trigger: authService.isLoading)
                        
                        HStack {
                            Text(isLogin ? "Don't have an account? " : "Already have an account? ")
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                                .foregroundStyle(Theme.textSecondary.hexColor)
                            
                            Button {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    isLogin.toggle()
                                }
                            } label: {
                                Text(isLogin ? "Sign up" : "Sign in")
                                    .font(.custom(Theme.FontWeight.bodySemiBold, size: 14))
                                    .foregroundStyle(Theme.emerald.hexColor)
                            }
                            .sensoryFeedback(.selection, trigger: isLogin)
                        }
                    }
                    .padding(32)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 32))
                    .overlay(
                        RoundedRectangle(cornerRadius: 32)
                            .stroke(.white.opacity(0.08), lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                    
                    Spacer()
                }
            }
            .scrollIndicators(.hidden)
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }
    
    private func handleSubmit() async {
        do {
            if isLogin {
                try await authService.login(email: email, password: password)
            } else {
                try await authService.register(name: name, email: email, password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}

// MARK: - Custom Text Field

struct CustomTextField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(Theme.textSecondary.hexColor)
            
            if isSecure {
                SecureField(placeholder, text: $text)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(Theme.textPrimary.hexColor)
            } else {
                TextField(placeholder, text: $text)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(Theme.textPrimary.hexColor)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(autocapitalization)
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 64)
        .background(.white.opacity(0.04))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.white.opacity(0.05), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Floating Orbs Background

struct FloatingOrbsView: View {
    @State private var positions: [CGPoint] = []
    
    var body: some View {
        ZStack {
            ForEach(0..<8, id: \.self) { index in
                FloatingOrb(
                    icon: ["sparkles", "cylinder.fill", "brain", "globe", "cpu", "waveform"][index % 6],
                    color: [Theme.emerald.hexColor, Theme.accent.hexColor, Theme.blue.hexColor, Theme.textSecondary.hexColor][index % 4],
                    size: CGFloat.random(in: 60...100)
                )
                .offset(
                    x: CGFloat.random(in: -100...100),
                    y: CGFloat.random(in: -300...300)
                )
            }
        }
    }
}

struct FloatingOrb: View {
    let icon: String
    let color: Color
    let size: CGFloat
    
    @State private var yOffset: CGFloat = 0
    @State private var xOffset: CGFloat = 0
    @State private var rotation: Double = 0
    
    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.15))
                .frame(width: size, height: size)
                .blur(radius: 2)
                .overlay(
                    Circle()
                        .stroke(color.opacity(0.3), lineWidth: 1)
                )
            
            Image(systemName: icon)
                .font(.system(size: size * 0.4, weight: .light))
                .foregroundStyle(color.opacity(0.6))
        }
        .offset(x: xOffset, y: yOffset)
        .rotationEffect(.degrees(rotation))
        .onAppear {
            withAnimation(.easeInOut(duration: Double.random(in: 4...6)).repeatForever(autoreverses: true)) {
                yOffset = CGFloat.random(in: -40...40)
                xOffset = CGFloat.random(in: -40...40)
            }
            
            withAnimation(.easeInOut(duration: Double.random(in: 5...8)).repeatForever(autoreverses: true)) {
                rotation = Double.random(in: -15...15)
            }
        }
    }
}

#Preview {
    AuthView()
        .environment(AuthService.shared)
}
