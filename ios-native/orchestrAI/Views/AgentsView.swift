import SwiftUI

struct AgentsView: View {
    @State private var viewModel = AgentsViewModel()
    @State private var selectedAgent: Agent? = nil
    @State private var showDetail = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Header
                        VStack(alignment: .leading, spacing: 6) {
                            Text("AI Workforce")
                                .font(.custom(Theme.FontWeight.bold, size: 34))
                                .foregroundStyle(.white)
                            
                            Text("\(viewModel.agents.filter(\.isActive).count) agents online • \(viewModel.agents.count) total")
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                                .foregroundStyle(Theme.textSecondary.hexColor)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                        
                        // Category Filter
                        if !viewModel.categories.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 10) {
                                    CategoryChip(
                                        title: "All",
                                        isSelected: viewModel.selectedCategory == nil,
                                        color: Theme.emerald.hexColor
                                    ) {
                                        withAnimation(Theme.Anim.snappy) {
                                            viewModel.selectedCategory = nil
                                        }
                                    }
                                    
                                    ForEach(viewModel.categories, id: \.self) { category in
                                        CategoryChip(
                                            title: category.capitalized,
                                            isSelected: viewModel.selectedCategory == category,
                                            color: agentColor(for: category)
                                        ) {
                                            withAnimation(Theme.Anim.snappy) {
                                                viewModel.selectedCategory = category
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                        
                        // Agent Grid
                        if viewModel.filteredAgents.isEmpty && !viewModel.isLoading {
                            EmptyAgentsView()
                        } else {
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 14) {
                                ForEach(Array(viewModel.filteredAgents.enumerated()), id: \.element.id) { index, agent in
                                    AgentCard(agent: agent) {
                                        selectedAgent = agent
                                        showDetail = true
                                    }
                                    .staggered(index: index)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        
                        Spacer().frame(height: 100)
                    }
                    .padding(.top, 8)
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await viewModel.fetchAgents()
                }
                
                if viewModel.isLoading && viewModel.agents.isEmpty {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Theme.emerald.hexColor)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showDetail) {
                if let agent = selectedAgent {
                    AgentDetailSheet(agent: agent, viewModel: viewModel)
                }
            }
        }
        .task {
            await viewModel.fetchAgents()
        }
    }
    
    private func agentColor(for category: String) -> Color {
        switch category.lowercased() {
        case "general", "core": return Theme.emerald.hexColor
        case "commerce", "sales": return Theme.accent.hexColor
        case "marketing": return "#FE2C55".hexColor
        case "analytics", "intelligence": return Theme.blue.hexColor
        case "communication": return "#EA4335".hexColor
        case "finance": return Theme.success.hexColor
        case "people", "hr": return "#FF9900".hexColor
        case "compliance", "legal": return Theme.purple.hexColor
        default: return Theme.emerald.hexColor
        }
    }
}

// MARK: - Category Chip

struct CategoryChip: View {
    let title: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.custom(Theme.FontWeight.semiBold, size: 14))
                .foregroundStyle(isSelected ? .white : Theme.textSecondary.hexColor)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(isSelected ? color.opacity(0.2) : .white.opacity(0.04))
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(isSelected ? color.opacity(0.4) : .clear, lineWidth: 1)
                )
        }
        .buttonStyle(ScaleButtonStyle())
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Agent Card

struct AgentCard: View {
    let agent: Agent
    let onTap: () -> Void
    
    private var meta: (icon: String, color: Color, badge: String) {
        switch agent.agentType {
        case "general": return ("brain.head.profile", Theme.emerald.hexColor, "CORE")
        case "shopify": return ("bag.fill", "#95BF47".hexColor, "COMMERCE")
        case "marketing_suite": return ("megaphone.fill", "#FE2C55".hexColor, "MARKETING")
        case "analytics": return ("chart.bar.fill", Theme.blue.hexColor, "INTEL")
        case "email": return ("envelope.fill", "#EA4335".hexColor, "COMMS")
        case "crm": return ("person.2.fill", Theme.accent.hexColor, "SALES")
        case "finance": return ("dollarsign.circle.fill", Theme.success.hexColor, "FINANCE")
        case "hr": return ("briefcase.fill", "#FF9900".hexColor, "PEOPLE")
        case "legal": return ("doc.text.fill", Theme.purple.hexColor, "LEGAL")
        default: return ("sparkles", Theme.emerald.hexColor, "AGENT")
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 14) {
                // Top: Badge + Status
                HStack {
                    Text(meta.badge)
                        .font(.custom(Theme.FontWeight.bold, size: 10))
                        .tracking(0.5)
                        .foregroundStyle(meta.color)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(meta.color.opacity(0.12))
                        .clipShape(Capsule())
                    
                    Spacer()
                    
                    if agent.isActive {
                        PulseIndicator(color: Theme.emerald.hexColor, size: 7)
                    } else {
                        Circle()
                            .fill(Theme.textDisabled.hexColor)
                            .frame(width: 7, height: 7)
                    }
                }
                
                // Icon
                IconBadge(icon: meta.icon, color: meta.color, size: 52)
                
                // Name + Description
                VStack(alignment: .leading, spacing: 4) {
                    Text(agent.name)
                        .font(.custom(Theme.FontWeight.bold, size: 17))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    
                    Text(agent.description)
                        .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                        .foregroundStyle(Theme.textTertiary.hexColor)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                
                // Stats Row
                HStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(agent.tasksCompleted)")
                            .font(.custom(Theme.FontWeight.semiBold, size: 15))
                            .foregroundStyle(.white)
                        
                        Text("Tasks")
                            .font(.custom(Theme.FontWeight.bodyRegular, size: 11))
                            .foregroundStyle(Theme.textTertiary.hexColor)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Rectangle()
                        .fill(.white.opacity(0.06))
                        .frame(width: 1, height: 28)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(agent.capabilities.count)")
                            .font(.custom(Theme.FontWeight.semiBold, size: 15))
                            .foregroundStyle(.white)
                        
                        Text("Skills")
                            .font(.custom(Theme.FontWeight.bodyRegular, size: 11))
                            .foregroundStyle(Theme.textTertiary.hexColor)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.leading, 12)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: 22)
                        .fill(.ultraThinMaterial)
                    
                    Circle()
                        .fill(meta.color.opacity(0.04))
                        .frame(width: 100, height: 100)
                        .blur(radius: 30)
                        .offset(x: 30, y: -20)
                }
                .clipShape(RoundedRectangle(cornerRadius: 22))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(meta.color.opacity(0.15), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
        .sensoryFeedback(.selection, trigger: agent.id)
    }
}

// MARK: - Agent Detail Sheet

struct AgentDetailSheet: View {
    let agent: Agent
    let viewModel: AgentsViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var isActive: Bool
    
    init(agent: Agent, viewModel: AgentsViewModel) {
        self.agent = agent
        self.viewModel = viewModel
        self._isActive = State(initialValue: agent.isActive)
    }
    
    private var meta: (icon: String, color: Color) {
        switch agent.agentType {
        case "general": return ("brain.head.profile", Theme.emerald.hexColor)
        case "shopify": return ("bag.fill", "#95BF47".hexColor)
        case "marketing_suite": return ("megaphone.fill", "#FE2C55".hexColor)
        case "analytics": return ("chart.bar.fill", Theme.blue.hexColor)
        case "email": return ("envelope.fill", "#EA4335".hexColor)
        case "crm": return ("person.2.fill", Theme.accent.hexColor)
        case "finance": return ("dollarsign.circle.fill", Theme.success.hexColor)
        case "hr": return ("briefcase.fill", "#FF9900".hexColor)
        case "legal": return ("doc.text.fill", Theme.purple.hexColor)
        default: return ("sparkles", Theme.emerald.hexColor)
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 28) {
                        // Hero
                        VStack(spacing: 16) {
                            IconBadge(icon: meta.icon, color: meta.color, size: 72)
                            
                            VStack(spacing: 6) {
                                Text(agent.name)
                                    .font(.custom(Theme.FontWeight.bold, size: 26))
                                    .foregroundStyle(.white)
                                    .multilineTextAlignment(.center)
                                
                                Text(agent.description)
                                    .font(.custom(Theme.FontWeight.bodyRegular, size: 15))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                                    .multilineTextAlignment(.center)
                                    .lineSpacing(4)
                            }
                        }
                        .padding(.top, 8)
                        
                        // Status Toggle
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Agent Status")
                                    .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                    .foregroundStyle(.white)
                                
                                Text(isActive ? "Active and processing tasks" : "Paused — not accepting tasks")
                                    .font(.custom(Theme.FontWeight.bodyRegular, size: 13))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                            }
                            
                            Spacer()
                            
                            Toggle("", isOn: $isActive)
                                .tint(Theme.emerald.hexColor)
                                .labelsHidden()
                                .onChange(of: isActive) { _, newValue in
                                    Task {
                                        await viewModel.toggleAgent(id: agent.id, isActive: newValue)
                                    }
                                }
                        }
                        .padding(18)
                        .glassCard(cornerRadius: 18)
                        .padding(.horizontal, 24)
                        
                        // Stats
                        HStack(spacing: 14) {
                            DetailStat(label: "Tasks", value: "\(agent.tasksCompleted)", color: meta.color)
                            DetailStat(label: "Skills", value: "\(agent.capabilities.count)", color: Theme.blue.hexColor)
                            DetailStat(label: "Mode", value: agent.autoExecute ? "Auto" : "Manual", color: Theme.accent.hexColor)
                        }
                        .padding(.horizontal, 24)
                        
                        // Capabilities
                        VStack(alignment: .leading, spacing: 14) {
                            SectionHeader(icon: "sparkles", title: "Capabilities", color: meta.color)
                            
                            FlowLayout(spacing: 8) {
                                ForEach(agent.capabilities, id: \.self) { capability in
                                    Text(capability)
                                        .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(meta.color.opacity(0.1))
                                        .clipShape(Capsule())
                                        .overlay(
                                            Capsule()
                                                .stroke(meta.color.opacity(0.2), lineWidth: 1)
                                        )
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                        
                        // Personality & Tone
                        VStack(alignment: .leading, spacing: 14) {
                            SectionHeader(icon: "face.smiling", title: "Personality", color: Theme.purple.hexColor)
                            
                            HStack(spacing: 12) {
                                DetailTag(label: "Style", value: agent.personality.capitalized)
                                DetailTag(label: "Tone", value: agent.tone.capitalized)
                            }
                        }
                        .padding(.horizontal, 24)
                        
                        // Chat Button
                        Button {
                            dismiss()
                            // Navigation to chat happens via parent
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "message.fill")
                                    .font(.system(size: 16, weight: .semibold))
                                Text("Chat with \(agent.name)")
                                    .font(.custom(Theme.FontWeight.semiBold, size: 17))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Theme.emeraldGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .shadow(color: Theme.emerald.hexColor.opacity(0.3), radius: 16, y: 8)
                        }
                        .buttonStyle(ScaleButtonStyle())
                        .padding(.horizontal, 24)
                        
                        Spacer().frame(height: 40)
                    }
                }
            }
            .navigationTitle("Agent Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Theme.emerald.hexColor)
                }
            }
        }
    }
}

struct DetailStat: View {
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 6) {
            Text(value)
                .font(.custom(Theme.FontWeight.bold, size: 22))
                .foregroundStyle(.white)
            
            Text(label)
                .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                .foregroundStyle(Theme.textSecondary.hexColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .glassCard(cornerRadius: 16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(color.opacity(0.12), lineWidth: 1)
        )
    }
}

struct DetailTag: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                .foregroundStyle(Theme.textTertiary.hexColor)
            
            Text(value)
                .font(.custom(Theme.FontWeight.semiBold, size: 15))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(in: proposal.width ?? 0, subviews: subviews)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(in: bounds.width, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }
    
    private func layout(in width: CGFloat, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxWidth: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxWidth = max(maxWidth, x)
        }
        
        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}

// MARK: - Empty State

struct EmptyAgentsView: View {
    var body: some View {
        VStack(spacing: 20) {
            Spacer().frame(height: 60)
            
            ZStack {
                Circle()
                    .fill(.white.opacity(0.03))
                    .frame(width: 80, height: 80)
                
                Image(systemName: "cpu")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(Theme.textTertiary.hexColor)
            }
            
            VStack(spacing: 8) {
                Text("No agents found")
                    .font(.custom(Theme.FontWeight.bold, size: 22))
                    .foregroundStyle(.white)
                
                Text("Your AI workforce will appear here once configured.")
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                    .foregroundStyle(Theme.textSecondary.hexColor)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 40)
        }
    }
}

#Preview {
    AgentsView()
}
