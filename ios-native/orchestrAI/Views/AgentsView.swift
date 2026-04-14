import SwiftUI

struct AgentsView: View {
    @State private var viewModel = AgentsViewModel()
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor
                    .ignoresSafeArea()
                
                ScrollView {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        ForEach(viewModel.agents) { agent in
                            AgentCard(agent: agent) {
                                // Navigate to chat
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 100)
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
            .navigationTitle("Agent Hub")
            .navigationBarTitleDisplayMode(.large)
        }
        .task {
            await viewModel.fetchAgents()
        }
    }
}

// MARK: - Agent Card

struct AgentCard: View {
    let agent: Agent
    let onTap: () -> Void
    
    private var agentMeta: (icon: String, color: Color, badge: String) {
        switch agent.agentType {
        case "general": return ("brain.head.profile", Theme.emerald.hexColor, "CORE")
        case "shopify": return ("bag.fill", "#95BF47".hexColor, "COMMERCE")
        case "marketing_suite": return ("megaphone.fill", "#FE2C55".hexColor, "MARKETING")
        case "analytics": return ("chart.bar.fill", Theme.blue.hexColor, "INTELLIGENCE")
        case "email": return ("envelope.fill", "#EA4335".hexColor, "COMMUNICATION")
        case "crm": return ("person.2.fill", Theme.accent.hexColor, "SALES")
        case "finance": return ("dollarsign.circle.fill", "#10B981".hexColor, "FINANCE")
        case "hr": return ("briefcase.fill", "#FF9900".hexColor, "PEOPLE")
        case "legal": return ("doc.text.fill", "#7B51AD".hexColor, "COMPLIANCE")
        default: return ("sparkles", Theme.emerald.hexColor, "AGENT")
        }
    }
    
    var body: some View {
        Button {
            onTap()
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    Text(agentMeta.badge)
                        .font(.custom(Theme.FontWeight.bold, size: 10))
                        .foregroundStyle(agentMeta.color)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(agentMeta.color.opacity(0.15))
                        .clipShape(Capsule())
                    
                    Spacer()
                    
                    if agent.isActive {
                        Circle()
                            .fill(Theme.emerald.hexColor)
                            .frame(width: 8, height: 8)
                    }
                }
                
                // Icon
                ZStack {
                    Circle()
                        .fill(agentMeta.color.opacity(0.15))
                        .frame(width: 60, height: 60)
                    
                    Image(systemName: agentMeta.icon)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(agentMeta.color)
                }
                
                // Name
                Text(agent.name)
                    .font(.custom(Theme.FontWeight.bold, size: 18))
                    .foregroundStyle(Theme.textPrimary.hexColor)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                // Stats
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(agent.tasksCompleted)")
                            .font(.custom(Theme.FontWeight.semiBold, size: 16))
                            .foregroundStyle(Theme.textPrimary.hexColor)
                        
                        Text("Tasks")
                            .font(.custom(Theme.FontWeight.bodyRegular, size: 11))
                            .foregroundStyle(Theme.textDisabled.hexColor)
                    }
                    
                    Divider()
                        .frame(height: 30)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(agent.capabilities.count)")
                            .font(.custom(Theme.FontWeight.semiBold, size: 16))
                            .foregroundStyle(Theme.textPrimary.hexColor)
                        
                        Text("Skills")
                            .font(.custom(Theme.FontWeight.bodyRegular, size: 11))
                            .foregroundStyle(Theme.textDisabled.hexColor)
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(agentMeta.color.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
        .sensoryFeedback(.selection, trigger: agent.id)
    }
}

// MARK: - Scale Button Style

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

#Preview {
    AgentsView()
}
