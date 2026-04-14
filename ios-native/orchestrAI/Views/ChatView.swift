import SwiftUI

struct ChatView: View {
    @State private var viewModel = ChatViewModel()
    @State private var messageText = ""
    @FocusState private var isInputFocused: Bool
    
    private let agentTypes: [(id: String, name: String, icon: String, color: Color)] = [
        ("general", "orchestrAI", "brain.filled.head.profile", Theme.emerald.hexColor),
        ("shopify", "Shopify EA", "bag.fill", "#95BF47".hexColor),
        ("marketing_suite", "Marketing", "megaphone.fill", "#FE2C55".hexColor),
        ("analytics", "Analytics", "chart.bar.fill", Theme.blue.hexColor),
        ("email", "Comms", "envelope.fill", "#EA4335".hexColor),
        ("crm", "CRM", "person.2.fill", Theme.accent.hexColor),
        ("finance", "CFO AI", "dollarsign.circle.fill", Theme.success.hexColor),
        ("legal", "Compliance", "shield.fill", Theme.purple.hexColor),
    ]
    
    private var currentAgent: (id: String, name: String, icon: String, color: Color) {
        agentTypes.first(where: { $0.id == viewModel.selectedAgentType }) ?? agentTypes[0]
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Agent Header
                    VStack(spacing: 14) {
                        HStack(spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(currentAgent.color.opacity(0.12))
                                    .frame(width: 44, height: 44)
                                
                                Circle()
                                    .stroke(currentAgent.color.opacity(0.3), lineWidth: 1)
                                    .frame(width: 44, height: 44)
                                
                                Image(systemName: currentAgent.icon)
                                    .font(.system(size: 20, weight: .medium))
                                    .foregroundStyle(currentAgent.color)
                            }
                            
                            VStack(alignment: .leading, spacing: 3) {
                                Text(currentAgent.name)
                                    .font(.custom(Theme.FontWeight.bold, size: 19))
                                    .foregroundStyle(.white)
                                
                                HStack(spacing: 5) {
                                    PulseIndicator(color: Theme.emerald.hexColor, size: 5)
                                    
                                    Text("Online")
                                        .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                                        .foregroundStyle(Theme.emerald.hexColor)
                                }
                            }
                            
                            Spacer()
                            
                            Button {
                                viewModel.switchAgent(to: viewModel.selectedAgentType)
                            } label: {
                                Image(systemName: "arrow.counterclockwise")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundStyle(Theme.textTertiary.hexColor)
                                    .frame(width: 36, height: 36)
                                    .background(.white.opacity(0.05))
                                    .clipShape(Circle())
                            }
                            .sensoryFeedback(.selection, trigger: UUID())
                        }
                        .padding(.horizontal, 20)
                        
                        // Agent Picker Chips
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(agentTypes, id: \.id) { agent in
                                    AgentChip(
                                        name: agent.name,
                                        icon: agent.icon,
                                        color: agent.color,
                                        isSelected: viewModel.selectedAgentType == agent.id
                                    ) {
                                        withAnimation(Theme.Anim.snappy) {
                                            viewModel.switchAgent(to: agent.id)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }
                    .padding(.vertical, 14)
                    .background(.ultraThinMaterial)
                    .overlay(
                        Rectangle()
                            .fill(.white.opacity(0.04))
                            .frame(height: 1),
                        alignment: .bottom
                    )
                    
                    // Messages
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                                    MessageBubble(
                                        message: message,
                                        agentColor: currentAgent.color,
                                        agentIcon: currentAgent.icon
                                    )
                                    .id(message.id)
                                    .transition(.asymmetric(
                                        insertion: .move(edge: .bottom).combined(with: .opacity),
                                        removal: .opacity
                                    ))
                                }
                                
                                if viewModel.isSending {
                                    TypingIndicator(color: currentAgent.color, icon: currentAgent.icon)
                                        .transition(.move(edge: .bottom).combined(with: .opacity))
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 20)
                        }
                        .scrollIndicators(.hidden)
                        .scrollDismissesKeyboard(.interactively)
                        .onChange(of: viewModel.messages.count) { _, _ in
                            if let last = viewModel.messages.last {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    proxy.scrollTo(last.id, anchor: .bottom)
                                }
                            }
                        }
                    }
                    
                    // Input Bar
                    ChatInputBar(
                        text: $messageText,
                        isFocused: $isInputFocused,
                        isSending: viewModel.isSending,
                        accentColor: currentAgent.color,
                        onSend: sendMessage
                    )
                }
            }
            .navigationBarHidden(true)
        }
        .onAppear {
            if viewModel.messages.isEmpty {
                viewModel.initializeChat()
            }
        }
    }
    
    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let content = messageText
        messageText = ""
        isInputFocused = false
        
        Task {
            await viewModel.sendMessage(content)
        }
    }
}

// MARK: - Agent Chip

struct AgentChip: View {
    let name: String
    let icon: String
    let color: Color
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                
                Text(name)
                    .font(.custom(Theme.FontWeight.semiBold, size: 13))
            }
            .foregroundStyle(isSelected ? .white : Theme.textTertiary.hexColor)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? color.opacity(0.2) : .white.opacity(0.04))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? color.opacity(0.35) : .clear, lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let agentColor: Color
    let agentIcon: String
    @State private var appeared = false
    
    var isUser: Bool { message.role == "user" }
    
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            if isUser { Spacer(minLength: 48) }
            
            if !isUser {
                ZStack {
                    Circle()
                        .fill(agentColor.opacity(0.12))
                        .frame(width: 30, height: 30)
                    
                    Image(systemName: agentIcon)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(agentColor)
                }
                .padding(.top, 2)
            }
            
            VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
                Text(message.content)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15.5))
                    .foregroundStyle(isUser ? .white : Theme.textPrimary.hexColor)
                    .lineSpacing(3)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        Group {
                            if isUser {
                                LinearGradient(
                                    colors: [agentColor, agentColor.opacity(0.85)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            } else {
                                Color.white.opacity(0.06)
                            }
                        }
                    )
                    .clipShape(
                        RoundedRectangle(cornerRadius: 20)
                    )
                    .overlay(
                        !isUser
                        ? RoundedRectangle(cornerRadius: 20)
                            .stroke(.white.opacity(0.04), lineWidth: 1)
                        : nil
                    )
                
                Text(formatTimestamp(message.timestamp))
                    .font(.custom(Theme.FontWeight.bodyRegular, size: 11))
                    .foregroundStyle(Theme.textDisabled.hexColor)
            }
            
            if !isUser { Spacer(minLength: 48) }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 8)
        .onAppear {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                appeared = true
            }
        }
    }
    
    private func formatTimestamp(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else { return "" }
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "h:mm a"
        return timeFormatter.string(from: date)
    }
}

// MARK: - Typing Indicator

struct TypingIndicator: View {
    let color: Color
    let icon: String
    @State private var dots: [Bool] = [false, false, false]
    
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.12))
                    .frame(width: 30, height: 30)
                
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(color)
            }
            .padding(.top, 2)
            
            HStack(spacing: 5) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(color.opacity(dots[index] ? 0.8 : 0.3))
                        .frame(width: 7, height: 7)
                        .scaleEffect(dots[index] ? 1.2 : 0.8)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(.white.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(.white.opacity(0.04), lineWidth: 1)
            )
            
            Spacer(minLength: 48)
        }
        .onAppear {
            animateDots()
        }
    }
    
    private func animateDots() {
        for i in 0..<3 {
            withAnimation(.easeInOut(duration: 0.5).repeatForever().delay(Double(i) * 0.15)) {
                dots[i] = true
            }
        }
    }
}

// MARK: - Chat Input Bar

struct ChatInputBar: View {
    @Binding var text: String
    var isFocused: FocusState<Bool>.Binding
    let isSending: Bool
    let accentColor: Color
    let onSend: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(.white.opacity(0.04))
                .frame(height: 1)
            
            HStack(alignment: .bottom, spacing: 10) {
                // Text field
                TextField("Message your agents...", text: $text, axis: .vertical)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(.white)
                    .lineLimit(1...5)
                    .focused(isFocused)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                    .background(.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(.white.opacity(0.08), lineWidth: 1)
                    )
                
                // Send button
                Button(action: onSend) {
                    ZStack {
                        Circle()
                            .fill(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                  ? Theme.textDisabled.hexColor
                                  : accentColor)
                            .frame(width: 46, height: 46)
                        
                        if isSending {
                            ProgressView()
                                .tint(.white)
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "arrow.up")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                    .shadow(color: text.isEmpty ? .clear : accentColor.opacity(0.3), radius: 8, y: 4)
                }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
                .sensoryFeedback(.impact(weight: .medium), trigger: isSending)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .padding(.bottom, 16)
            .background(.ultraThinMaterial)
        }
    }
}

#Preview {
    ChatView()
}
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
