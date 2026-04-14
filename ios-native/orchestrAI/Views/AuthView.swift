import SwiftUI

struct AuthView: View {
    @Environment(AuthService.self) private var authService
    @State private var isLogin = true
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var showPassword = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var appeared = false
    
    var body: some View {
        ZStack {
            Theme.bgPrimary.hexColor.ignoresSafeArea()
            
            AmbientOrbsBackground()
            
            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 80)
                    
                    // Brand Mark
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Theme.emerald.hexColor.opacity(0.07))
                                .frame(width: 100, height: 100)
                                .blur(radius: 20)
                            
                            Circle()
                                .fill(Theme.emerald.hexColor.opacity(0.05))
                                .frame(width: 84, height: 84)
                            
                            Circle()
                                .stroke(Theme.emerald.hexColor.opacity(0.25), lineWidth: 1)
                                .frame(width: 84, height: 84)
                            
                            Image(systemName: "brain.filled.head.profile")
                                .font(.system(size: 38, weight: .light))
                                .foregroundStyle(Theme.emerald.hexColor)
                        }
                        .opacity(appeared ? 1 : 0)
                        .scaleEffect(appeared ? 1 : 0.8)
                        
                        VStack(spacing: 8) {
                            Text("orchestrAI")
                                .font(.custom(Theme.FontWeight.light, size: 44))
                                .foregroundStyle(.white)
                                .tracking(-1.5)
                            
                            Text("Your AI-powered business operating system")
                                .font(.custom(Theme.FontWeight.bodyRegular, size: 15))
                                .foregroundStyle(Theme.textSecondary.hexColor)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 8)
                        }
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 10)
                    }
                    .padding(.bottom, 40)
                    
                    // Auth Card
                    VStack(spacing: 20) {
                        // Mode Toggle
                        HStack(spacing: 0) {
                            AuthModeTab(title: "Sign In", isSelected: isLogin) {
                                withAnimation(Theme.Anim.snappy) { isLogin = true }
                            }
                            AuthModeTab(title: "Create Account", isSelected: !isLogin) {
                                withAnimation(Theme.Anim.snappy) { isLogin = false }
                            }
                        }
                        .padding(4)
                        .background(.white.opacity(0.04))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        
                        // Fields
                        VStack(spacing: 14) {
                            if !isLogin {
                                AuthTextField(
                                    icon: "person",
                                    placeholder: "Full Name",
                                    text: $name
                                )
                                .transition(.asymmetric(
                                    insertion: .move(edge: .top).combined(with: .opacity),
                                    removal: .move(edge: .top).combined(with: .opacity)
                                ))
                            }
                            
                            AuthTextField(
                                icon: "envelope",
                                placeholder: "Email",
                                text: $email,
                                keyboardType: .emailAddress,
                                autocapitalization: .never
                            )
                            
                            AuthTextField(
                                icon: "lock",
                                placeholder: "Password",
                                text: $password,
                                isSecure: !showPassword,
                                trailing: {
                                    Button {
                                        showPassword.toggle()
                                    } label: {
                                        Image(systemName: showPassword ? "eye.slash" : "eye")
                                            .font(.system(size: 16, weight: .medium))
                                            .foregroundStyle(Theme.textTertiary.hexColor)
                                    }
                                    .sensoryFeedback(.selection, trigger: showPassword)
                                }
                            )
                        }
                        
                        // Submit
                        Button {
                            Task { await handleSubmit() }
                        } label: {
                            ZStack {
                                if authService.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    HStack(spacing: 10) {
                                        Text(isLogin ? "Sign In" : "Get Started")
                                            .font(.custom(Theme.FontWeight.semiBold, size: 17))
                                        
                                        Image(systemName: "arrow.right")
                                            .font(.system(size: 14, weight: .bold))
                                    }
                                }
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Theme.emeraldGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .shadow(color: Theme.emerald.hexColor.opacity(0.3), radius: 16, y: 8)
                        }
                        .disabled(authService.isLoading || !isFormValid)
                        .opacity(isFormValid ? 1.0 : 0.5)
                        .sensoryFeedback(.impact(weight: .heavy), trigger: authService.isLoading)
                        
                        // Divider
                        HStack(spacing: 16) {
                            Rectangle().fill(.white.opacity(0.06)).frame(height: 1)
                            Text("or")
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                                .foregroundStyle(Theme.textTertiary.hexColor)
                            Rectangle().fill(.white.opacity(0.06)).frame(height: 1)
                        }
                        
                        // Social Auth
                        HStack(spacing: 12) {
                            SocialAuthButton(icon: "apple.logo", label: "Apple")
                            SocialAuthButton(icon: "globe", label: "Google")
                        }
                    }
                    .padding(28)
                    .glassCard(cornerRadius: 28, borderOpacity: 0.06)
                    .padding(.horizontal, 20)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 30)
                    
                    // Terms
                    Text("By continuing, you agree to our Terms of Service\nand Privacy Policy")
                        .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                        .foregroundStyle(Theme.textTertiary.hexColor)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .padding(.top, 24)
                        .opacity(appeared ? 0.7 : 0)
                    
                    Spacer().frame(height: 40)
                }
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
        }
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.7).delay(0.1)) {
                appeared = true
            }
        }
        .alert("Sign In Error", isPresented: $showError) {
            Button("Try Again", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }
    
    private var isFormValid: Bool {
        let emailValid = email.contains("@") && email.contains(".")
        let passwordValid = password.count >= 6
        let nameValid = isLogin || name.count >= 2
        return emailValid && passwordValid && nameValid
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

// MARK: - Auth Mode Tab

struct AuthModeTab: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.custom(Theme.FontWeight.semiBold, size: 15))
                .foregroundStyle(isSelected ? .white : Theme.textTertiary.hexColor)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(isSelected ? .white.opacity(0.08) : .clear)
                .clipShape(RoundedRectangle(cornerRadius: 11))
        }
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Auth Text Field

struct AuthTextField<Trailing: View>: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    @ViewBuilder var trailing: () -> Trailing
    
    init(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        isSecure: Bool = false,
        keyboardType: UIKeyboardType = .default,
        autocapitalization: TextInputAutocapitalization = .sentences,
        @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }
    ) {
        self.icon = icon
        self.placeholder = placeholder
        self._text = text
        self.isSecure = isSecure
        self.keyboardType = keyboardType
        self.autocapitalization = autocapitalization
        self.trailing = trailing
    }
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(Theme.textTertiary.hexColor)
                .frame(width: 24)
            
            if isSecure {
                SecureField(placeholder, text: $text)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(.white)
            } else {
                TextField(placeholder, text: $text)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(.white)
                    .keyboardType(keyboardType)
                    .textInputAutocapitalization(autocapitalization)
            }
            
            trailing()
        }
        .padding(.horizontal, 16)
        .frame(height: 56)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(.white.opacity(0.06), lineWidth: 1)
        )
    }
}

// MARK: - Social Auth Button

struct SocialAuthButton: View {
    let icon: String
    let label: String
    
    var body: some View {
        Button {
            // Social auth handler
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                Text(label)
                    .font(.custom(Theme.FontWeight.semiBold, size: 15))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(.white.opacity(0.08), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

#Preview {
    AuthView()
        .environment(AuthService.shared)
}
