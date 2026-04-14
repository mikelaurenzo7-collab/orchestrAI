import SwiftUI

struct ChatView: View {
    @State private var viewModel = ChatViewModel()
    @State private var selectedAgent: String = "general"
    @State private var messageText: String = ""
    @FocusState private var isInputFocused: Bool
    
    private var currentAgentMeta: (name: String, icon: String, color: Color) {
        switch selectedAgent {
        case "general":
            return ("orchestrAI", "brain.filled.head.profile", Theme.emerald.hexColor)
        case "shopify":
            return ("Shopify EA", "cart.fill", "#95BF47".hexColor)
        case "marketing_suite":
            return ("Marketing Exec", "megaphone.fill", Theme.blue.hexColor)
        case "analytics":
            return ("Data Analyst", "chart.bar.fill", Theme.accent.hexColor)
        case "email":
            return ("Comms Exec", "envelope.fill", "#FFFFFF".hexColor)
        case "crm":
            return ("CRM Specialist", "person.2.fill", Theme.accent.hexColor)
        case "finance":
            return ("CFO AI", "dollarsign.circle.fill", "#10B981".hexColor)
        case "operations":
            return ("Ops Manager", "gearshape.fill", "#8B5CF6".hexColor)
        case "legal":
            return ("Compliance AI", "shield.fill", "#EF4444".hexColor)
        default:
            return ("orchestrAI", "brain.filled.head.profile", Theme.emerald.hexColor)
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(currentAgentMeta.color.opacity(0.15))
                                .frame(width: 48, height: 48)
                            
                            Circle()
                                .stroke(currentAgentMeta.color.opacity(0.4), lineWidth: 1)
                                .frame(width: 48, height: 48)
                            
                            Image(systemName: currentAgentMeta.icon)
                                .font(.system(size: 22, weight: .medium))
                                .foregroundStyle(currentAgentMeta.color)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(currentAgentMeta.name)
                                .font(.custom(Theme.FontWeight.bold, size: 20))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                            
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(Theme.emerald.hexColor)
                                    .frame(width: 6, height: 6)
                                
                                Text("Active and ready")
                                    .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                                    .foregroundStyle(Theme.emerald.hexColor)
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(24)
                    .background(.ultraThinMaterial)
                    .overlay(
                        Rectangle()
                            .fill(.white.opacity(0.05))
                            .frame(height: 1),
                        alignment: .bottom
                    )
                    
                    // Messages
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(viewModel.messages) { message in
                                    MessageBubble(
                                        message: message,
                                        agentColor: currentAgentMeta.color
                                    )
                                    .id(message.id)
                                }
                                
                                if viewModel.isSending {
                                    TypingIndicator(color: currentAgentMeta.color)
                                }
                            }
                            .padding(24)
                        }
                        .scrollIndicators(.hidden)
                        .onChange(of: viewModel.messages.count) { _, _ in
                            if let lastMessage = viewModel.messages.last {
                                withAnimation {
                                    proxy.scrollTo(lastMessage.id, anchor: .bottom)
                                }
                            }
                        }
                    }
                    
                    // Input Area
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(.white.opacity(0.05))
                            .frame(height: 1)
                        
                        HStack(alignment: .bottom, spacing: 12) {
                            HStack(spacing: 12) {
                                TextField("Ask your agents...", text: $messageText, axis: .vertical)
                                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                                    .foregroundStyle(Theme.textPrimary.hexColor)
                                    .lineLimit(1...5)
                                    .focused($isInputFocused)
                                    .padding(.vertical, 12)
                                    .padding(.leading, 16)
                            }
                            .background(.black.opacity(0.4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 24)
                                    .stroke(.white.opacity(0.1), lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 24))
                            
                            Button {
                                sendMessage()
                            } label: {
                                ZStack {
                                    Circle()
                                        .fill(messageText.isEmpty ? Theme.textDisabled.hexColor : Theme.emerald.hexColor)
                                        .frame(width: 48, height: 48)
                                    
                                    if viewModel.isSending {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Image(systemName: "arrow.up")
                                            .font(.system(size: 18, weight: .bold))
                                            .foregroundStyle(.white)
                                    }
                                }
                            }
                            .disabled(messageText.isEmpty || viewModel.isSending)
                            .sensoryFeedback(.impact(weight: .medium), trigger: viewModel.isSending)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .padding(.bottom, 20)
                        .background(.ultraThinMaterial)
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .onAppear {
            if viewModel.messages.isEmpty {
                viewModel.initializeChat(for: selectedAgent)
            }
        }
    }
    
    private func sendMessage() {
        guard !messageText.isEmpty else { return }
        let content = messageText
        messageText = ""
        isInputFocused = false
        
        Task {
            await viewModel.sendMessage(content, agentType: selectedAgent)
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let agentColor: Color
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            if message.role == "user" {
                Spacer(minLength: 60)
            } else {
                ZStack {
                    Circle()
                        .fill(agentColor.opacity(0.15))
                        .frame(width: 28, height: 28)
                    
                    Circle()
                        .stroke(agentColor.opacity(0.3), lineWidth: 1)
                        .frame(width: 28, height: 28)
                    
                    Image(systemName: "brain.filled.head.profile")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(agentColor)
                }
            }
            
            VStack(alignment: message.role == "user" ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(message.role == "user" ? Theme.bgPrimary.hexColor : Theme.textPrimary.hexColor)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        message.role == "user"
                        ? AnyShapeStyle(Theme.emerald.hexColor)
                        : AnyShapeStyle(.ultraThinMaterial)
                    )
                    .clipShape(
                        RoundedRectangle(cornerRadius: 20)
                    )
                    .overlay(
                        message.role == "assistant"
                        ? RoundedRectangle(cornerRadius: 20)
                            .stroke(.white.opacity(0.04), lineWidth: 1)
                        : nil
                    )
            }
            
            if message.role == "assistant" {
                Spacer(minLength: 60)
            }
        }
    }
}

// MARK: - Typing Indicator

struct TypingIndicator: View {
    let color: Color
    @State private var dotScale1: CGFloat = 1.0
    @State private var dotScale2: CGFloat = 1.0
    @State private var dotScale3: CGFloat = 1.0
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 28, height: 28)
                
                Image(systemName: "brain.filled.head.profile")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(color)
            }
            
            HStack(spacing: 6) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(color)
                        .frame(width: 6, height: 6)
                        .scaleEffect(index == 0 ? dotScale1 : (index == 1 ? dotScale2 : dotScale3))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            
            Spacer(minLength: 60)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever()) {
                dotScale1 = 1.3
            }
            withAnimation(.easeInOut(duration: 0.6).repeatForever().delay(0.2)) {
                dotScale2 = 1.3
            }
            withAnimation(.easeInOut(duration: 0.6).repeatForever().delay(0.4)) {
                dotScale3 = 1.3
            }
        }
    }
}

#Preview {
    ChatView()
}
