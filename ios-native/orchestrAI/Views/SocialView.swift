import SwiftUI

struct SocialView: View {
    @State private var viewModel = SocialViewModel()
    @State private var showCompose = false
    @State private var selectedFilter: String? = nil
    
    private var displayedPosts: [SocialPost] {
        switch selectedFilter {
        case "published": return viewModel.publishedPosts
        case "scheduled": return viewModel.scheduledPosts
        case "draft": return viewModel.draftPosts
        default: return viewModel.posts
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 22) {
                        // Header
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Broadcast")
                                    .font(.custom(Theme.FontWeight.bold, size: 34))
                                    .foregroundStyle(.white)
                                
                                Text("AI-powered social campaigns")
                                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                            }
                            
                            Spacer()
                            
                            Button {
                                showCompose = true
                            } label: {
                                HStack(spacing: 7) {
                                    Image(systemName: "square.and.pencil")
                                        .font(.system(size: 15, weight: .semibold))
                                    Text("Draft")
                                        .font(.custom(Theme.FontWeight.bold, size: 15))
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 11)
                                .background(Theme.emeraldGradient)
                                .clipShape(Capsule())
                                .shadow(color: Theme.emerald.hexColor.opacity(0.3), radius: 10, y: 4)
                            }
                            .buttonStyle(ScaleButtonStyle())
                            .sensoryFeedback(.impact(weight: .medium), trigger: showCompose)
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                        
                        // Filter Pills
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                FilterPill(title: "All", count: viewModel.posts.count, isSelected: selectedFilter == nil) {
                                    withAnimation(Theme.Anim.snappy) { selectedFilter = nil }
                                }
                                FilterPill(title: "Published", count: viewModel.publishedPosts.count, isSelected: selectedFilter == "published") {
                                    withAnimation(Theme.Anim.snappy) { selectedFilter = "published" }
                                }
                                FilterPill(title: "Scheduled", count: viewModel.scheduledPosts.count, isSelected: selectedFilter == "scheduled") {
                                    withAnimation(Theme.Anim.snappy) { selectedFilter = "scheduled" }
                                }
                                FilterPill(title: "Drafts", count: viewModel.draftPosts.count, isSelected: selectedFilter == "draft") {
                                    withAnimation(Theme.Anim.snappy) { selectedFilter = "draft" }
                                }
                            }
                            .padding(.horizontal, 24)
                        }
                        
                        // Posts
                        if displayedPosts.isEmpty && !viewModel.isLoading {
                            EmptyPostsView()
                        } else {
                            VStack(spacing: 16) {
                                ForEach(Array(displayedPosts.enumerated()), id: \.element.id) { index, post in
                                    SocialPostCard(post: post)
                                        .staggered(index: index)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        
                        Spacer().frame(height: 100)
                    }
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await viewModel.fetchPosts()
                }
                
                if viewModel.isLoading && viewModel.posts.isEmpty {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Theme.emerald.hexColor)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCompose) {
                ComposePostSheet()
            }
        }
        .task {
            if viewModel.posts.isEmpty {
                await viewModel.fetchPosts()
            }
        }
    }
}

// MARK: - Filter Pill

struct FilterPill: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.custom(Theme.FontWeight.semiBold, size: 14))
                
                if count > 0 {
                    Text("\(count)")
                        .font(.custom(Theme.FontWeight.bold, size: 12))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(isSelected ? .white.opacity(0.15) : .white.opacity(0.06))
                        .clipShape(Capsule())
                }
            }
            .foregroundStyle(isSelected ? .white : Theme.textSecondary.hexColor)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(isSelected ? Theme.emerald.hexColor.opacity(0.18) : .white.opacity(0.04))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? Theme.emerald.hexColor.opacity(0.35) : .clear, lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Social Post Card

struct SocialPostCard: View {
    let post: SocialPost
    
    private var statusMeta: (label: String, color: Color, icon: String) {
        switch post.status {
        case "published": return ("Published", Theme.emerald.hexColor, "checkmark.circle.fill")
        case "scheduled": return ("Scheduled", Theme.blue.hexColor, "clock.fill")
        case "draft": return ("Draft", Theme.textSecondary.hexColor, "doc.fill")
        default: return (post.status.capitalized, Theme.textSecondary.hexColor, "circle.fill")
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Theme.emerald.hexColor.opacity(0.12))
                        .frame(width: 42, height: 42)
                    
                    Image(systemName: "brain")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Theme.emerald.hexColor)
                }
                
                VStack(alignment: .leading, spacing: 3) {
                    Text("Marketing AI")
                        .font(.custom(Theme.FontWeight.bold, size: 17))
                        .foregroundStyle(.white)
                    
                    HStack(spacing: 6) {
                        // Platforms
                        HStack(spacing: 4) {
                            ForEach(post.platforms, id: \.self) { platform in
                                Image(systemName: platformIcon(for: platform))
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                            }
                        }
                        
                        Text("•")
                            .foregroundStyle(Theme.textDisabled.hexColor)
                        
                        Text(relativeTime(from: post.createdAt))
                            .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                            .foregroundStyle(Theme.textTertiary.hexColor)
                    }
                }
                
                Spacer()
                
                // Status badge
                HStack(spacing: 4) {
                    Image(systemName: statusMeta.icon)
                        .font(.system(size: 10, weight: .bold))
                    Text(statusMeta.label)
                        .font(.custom(Theme.FontWeight.semiBold, size: 11))
                }
                .foregroundStyle(statusMeta.color)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(statusMeta.color.opacity(0.1))
                .clipShape(Capsule())
            }
            
            // Content
            Text(post.content)
                .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                .foregroundStyle(.white.opacity(0.9))
                .lineSpacing(5)
                .lineLimit(6)
            
            // Engagement Metrics
            if let metrics = post.metrics {
                HStack(spacing: 0) {
                    EngagementMetric(icon: "heart.fill", value: metrics.likes, color: "#FF2D55".hexColor)
                    EngagementMetric(icon: "hand.tap.fill", value: metrics.clicks, color: Theme.blue.hexColor)
                    EngagementMetric(icon: "arrow.2.squarepath", value: metrics.shares, color: Theme.emerald.hexColor)
                }
                .padding(.vertical, 10)
                .background(.white.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            
            // Actions
            HStack(spacing: 16) {
                PostAction(icon: "heart", label: "Like")
                PostAction(icon: "bubble.left", label: "Reply")
                PostAction(icon: "arrow.2.squarepath", label: "Repost")
                
                Spacer()
                
                Button {
                    // Share
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textTertiary.hexColor)
                }
            }
        }
        .padding(20)
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: 22)
                    .fill(.ultraThinMaterial)
                
                Circle()
                    .fill(Theme.emerald.hexColor.opacity(0.03))
                    .frame(width: 150, height: 150)
                    .blur(radius: 40)
                    .offset(x: 60, y: -40)
            }
            .clipShape(RoundedRectangle(cornerRadius: 22))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(.white.opacity(0.06), lineWidth: 1)
        )
    }
    
    private func platformIcon(for platform: String) -> String {
        switch platform.lowercased() {
        case "twitter": return "text.bubble"
        case "linkedin": return "briefcase"
        case "instagram": return "camera"
        case "facebook": return "person.3"
        case "pinterest": return "pin"
        case "tiktok": return "play.rectangle"
        default: return "globe"
        }
    }
    
    private func relativeTime(from isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else { return "Now" }
        let seconds = Date().timeIntervalSince(date)
        if seconds < 60 { return "Just now" }
        if seconds < 3600 { return "\(Int(seconds / 60))m ago" }
        if seconds < 86400 { return "\(Int(seconds / 3600))h ago" }
        return "\(Int(seconds / 86400))d ago"
    }
}

// MARK: - Engagement Metric

struct EngagementMetric: View {
    let icon: String
    let value: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(color)
                
                Text(formatNumber(value))
                    .font(.custom(Theme.FontWeight.bold, size: 16))
                    .foregroundStyle(.white)
            }
            
            // Mini bar
            GeometryReader { geo in
                RoundedRectangle(cornerRadius: 2)
                    .fill(color.opacity(0.3))
                    .frame(width: geo.size.width * 0.6, height: 3)
                    .frame(maxWidth: .infinity)
            }
            .frame(height: 3)
        }
        .frame(maxWidth: .infinity)
    }
    
    private func formatNumber(_ num: Int) -> String {
        if num >= 1_000_000 { return String(format: "%.1fM", Double(num) / 1_000_000) }
        if num >= 1_000 { return String(format: "%.1fK", Double(num) / 1_000) }
        return "\(num)"
    }
}

// MARK: - Post Action

struct PostAction: View {
    let icon: String
    let label: String
    @State private var isActive = false
    
    var body: some View {
        Button {
            withAnimation(Theme.Anim.bouncy) { isActive.toggle() }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: isActive ? "\(icon).fill" : icon)
                    .font(.system(size: 15, weight: .medium))
                Text(label)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
            }
            .foregroundStyle(isActive ? Theme.emerald.hexColor : Theme.textTertiary.hexColor)
        }
        .buttonStyle(ScaleButtonStyle())
        .sensoryFeedback(.selection, trigger: isActive)
    }
}

// MARK: - Empty Posts

struct EmptyPostsView: View {
    var body: some View {
        VStack(spacing: 20) {
            Spacer().frame(height: 60)
            
            ZStack {
                Circle()
                    .fill(.white.opacity(0.03))
                    .frame(width: 80, height: 80)
                
                Image(systemName: "megaphone")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(Theme.textTertiary.hexColor)
            }
            
            VStack(spacing: 8) {
                Text("No broadcasts yet")
                    .font(.custom(Theme.FontWeight.bold, size: 22))
                    .foregroundStyle(.white)
                
                Text("Let AI draft and publish campaigns\nacross all your social platforms.")
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                    .foregroundStyle(Theme.textSecondary.hexColor)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

// MARK: - Compose Sheet

struct ComposePostSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var content = ""
    @State private var selectedPlatforms: Set<String> = ["twitter", "linkedin"]
    
    private let platforms: [(id: String, name: String, icon: String)] = [
        ("twitter", "X", "text.bubble"),
        ("linkedin", "LinkedIn", "briefcase"),
        ("instagram", "Instagram", "camera"),
        ("facebook", "Facebook", "person.3"),
        ("pinterest", "Pinterest", "pin"),
        ("tiktok", "TikTok", "play.rectangle")
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Platform Selection
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Platforms")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(.white)
                            
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                                ForEach(platforms, id: \.id) { platform in
                                    let isSelected = selectedPlatforms.contains(platform.id)
                                    
                                    Button {
                                        withAnimation(Theme.Anim.snappy) {
                                            if isSelected {
                                                selectedPlatforms.remove(platform.id)
                                            } else {
                                                selectedPlatforms.insert(platform.id)
                                            }
                                        }
                                    } label: {
                                        VStack(spacing: 8) {
                                            Image(systemName: platform.icon)
                                                .font(.system(size: 18, weight: .medium))
                                                .foregroundStyle(isSelected ? Theme.emerald.hexColor : Theme.textTertiary.hexColor)
                                            
                                            Text(platform.name)
                                                .font(.custom(Theme.FontWeight.medium, size: 12))
                                                .foregroundStyle(isSelected ? .white : Theme.textTertiary.hexColor)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(isSelected ? Theme.emerald.hexColor.opacity(0.1) : .white.opacity(0.03))
                                        .clipShape(RoundedRectangle(cornerRadius: 14))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 14)
                                                .stroke(isSelected ? Theme.emerald.hexColor.opacity(0.3) : .clear, lineWidth: 1)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    .sensoryFeedback(.selection, trigger: isSelected)
                                }
                            }
                        }
                        
                        // Content
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text("Content")
                                    .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                    .foregroundStyle(.white)
                                
                                Spacer()
                                
                                Text("\(content.count) chars")
                                    .font(.custom(Theme.FontWeight.bodyRegular, size: 13))
                                    .foregroundStyle(Theme.textTertiary.hexColor)
                            }
                            
                            TextEditor(text: $content)
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                                .foregroundStyle(.white)
                                .scrollContentBackground(.hidden)
                                .frame(minHeight: 180)
                                .padding(16)
                                .background(.white.opacity(0.04))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(.white.opacity(0.06), lineWidth: 1)
                                )
                        }
                        
                        // AI Generate
                        Button {
                            // AI generation
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 15, weight: .semibold))
                                Text("Generate with AI")
                                    .font(.custom(Theme.FontWeight.semiBold, size: 16))
                            }
                            .foregroundStyle(Theme.emerald.hexColor)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Theme.emerald.hexColor.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Theme.emerald.hexColor.opacity(0.2), lineWidth: 1)
                            )
                        }
                        .buttonStyle(ScaleButtonStyle())
                        
                        // Publish
                        Button {
                            dismiss()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "paperplane.fill")
                                    .font(.system(size: 15, weight: .semibold))
                                Text("Schedule Broadcast")
                                    .font(.custom(Theme.FontWeight.semiBold, size: 17))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(content.isEmpty || selectedPlatforms.isEmpty
                                        ? Theme.textDisabled.hexColor
                                        : Theme.emeraldGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .shadow(color: content.isEmpty ? .clear : Theme.emerald.hexColor.opacity(0.3), radius: 12, y: 6)
                        }
                        .disabled(content.isEmpty || selectedPlatforms.isEmpty)
                        .buttonStyle(ScaleButtonStyle())
                    }
                    .padding(24)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationTitle("New Broadcast")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.emerald.hexColor)
                }
            }
        }
    }
}

#Preview {
    SocialView()
}
import SwiftUI

struct SocialView: View {
    @State private var viewModel = SocialViewModel()
    @State private var showCompose = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Broadcast")
                                    .font(.custom(Theme.FontWeight.bold, size: 34))
                                    .foregroundStyle(Theme.textPrimary.hexColor)
                                
                                Text("AI-generated social campaigns")
                                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                            }
                            
                            Spacer()
                            
                            Button {
                                showCompose = true
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "square.and.pencil")
                                        .font(.system(size: 18, weight: .semibold))
                                    
                                    Text("Draft")
                                        .font(.custom(Theme.FontWeight.bold, size: 16))
                                }
                                .foregroundStyle(Theme.bgPrimary.hexColor)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 12)
                                .background(Theme.emerald.hexColor)
                                .clipShape(Capsule())
                                .shadow(color: Theme.emerald.hexColor.opacity(0.3), radius: 12, x: 0, y: 4)
                            }
                            .sensoryFeedback(.impact(weight: .medium), trigger: showCompose)
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        
                        // Posts List
                        VStack(spacing: 16) {
                            ForEach(viewModel.posts) { post in
                                SocialPostCard(post: post)
                                    .transition(.asymmetric(
                                        insertion: .move(edge: .bottom).combined(with: .opacity),
                                        removal: .opacity
                                    ))
                            }
                        }
                        .padding(.horizontal, 16)
                        
                        Spacer()
                            .frame(height: 100)
                    }
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await viewModel.fetchPosts()
                }
                
                // Loading State
                if viewModel.isLoading && viewModel.posts.isEmpty {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Theme.emerald.hexColor)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCompose) {
                ComposePostSheet()
            }
        }
        .task {
            if viewModel.posts.isEmpty {
                await viewModel.fetchPosts()
            }
        }
    }
}

// MARK: - Social Post Card

struct SocialPostCard: View {
    let post: SocialPost
    @State private var showOptions = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack(spacing: 12) {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Theme.emerald.hexColor.opacity(0.15))
                            .frame(width: 44, height: 44)
                        
                        Circle()
                            .stroke(Theme.emerald.hexColor.opacity(0.3), lineWidth: 1)
                            .frame(width: 44, height: 44)
                        
                        Image(systemName: "brain")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundStyle(Theme.emerald.hexColor)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Marketing AI Exec")
                            .font(.custom(Theme.FontWeight.bold, size: 18))
                            .foregroundStyle(Theme.textPrimary.hexColor)
                        
                        Text("2h ago • \(post.platforms.map { $0.capitalized }.joined(separator: ", "))")
                            .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                            .foregroundStyle(Theme.textSecondary.hexColor)
                    }
                }
                
                Spacer()
                
                Button {
                    showOptions = true
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Theme.textSecondary.hexColor)
                        .frame(width: 32, height: 32)
                }
                .sensoryFeedback(.selection, trigger: showOptions)
            }
            
            // Content
            Text(post.content)
                .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                .foregroundStyle(Theme.textPrimary.hexColor)
                .lineSpacing(6)
            
            // Media Placeholder
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Theme.emerald.hexColor.opacity(0.05))
                    .frame(height: 180)
                
                RoundedRectangle(cornerRadius: 16)
                    .stroke(.white.opacity(0.05), lineWidth: 1)
                    .frame(height: 180)
                
                VStack(spacing: 12) {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 40, weight: .light))
                        .foregroundStyle(Theme.emerald.hexColor.opacity(0.6))
                    
                    Text("Attached Media")
                        .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                        .foregroundStyle(Theme.textSecondary.hexColor)
                }
            }
            
            // Divider
            Rectangle()
                .fill(.white.opacity(0.08))
                .frame(height: 1)
            
            // Actions
            HStack(spacing: 24) {
                ActionButton(
                    icon: "heart",
                    count: post.metrics?.likes ?? 0
                )
                
                ActionButton(
                    icon: "message",
                    count: post.metrics?.clicks ?? 0
                )
                
                ActionButton(
                    icon: "repeat",
                    count: post.metrics?.shares ?? 0
                )
                
                Spacer()
                
                Button {
                    // Share action
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Theme.emerald.hexColor)
                }
                .sensoryFeedback(.selection, trigger: UUID())
            }
        }
        .padding(20)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(.white.opacity(0.06), lineWidth: 1)
        )
        .background(
            Color.black.opacity(0.3)
                .clipShape(RoundedRectangle(cornerRadius: 24))
        )
    }
}

// MARK: - Action Button

struct ActionButton: View {
    let icon: String
    let count: Int
    @State private var isPressed = false
    
    var body: some View {
        Button {
            isPressed.toggle()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Theme.textSecondary.hexColor)
                
                Text(formatNumber(count))
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                    .foregroundStyle(Theme.textSecondary.hexColor)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isPressed)
    }
    
    private func formatNumber(_ num: Int) -> String {
        if num >= 1000 {
            return String(format: "%.1fk", Double(num) / 1000.0)
        }
        return "\(num)"
    }
}

// MARK: - Compose Post Sheet

struct ComposePostSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var content = ""
    @State private var selectedPlatforms: Set<String> = ["twitter", "linkedin"]
    
    private let platforms = [
        ("twitter", "Twitter/X", "text.bubble"),
        ("linkedin", "LinkedIn", "briefcase"),
        ("instagram", "Instagram", "photo"),
        ("facebook", "Facebook", "person.3")
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Platform Selection
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Platforms")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                            
                            HStack(spacing: 12) {
                                ForEach(platforms, id: \.0) { platform in
                                    Button {
                                        if selectedPlatforms.contains(platform.0) {
                                            selectedPlatforms.remove(platform.0)
                                        } else {
                                            selectedPlatforms.insert(platform.0)
                                        }
                                    } label: {
                                        VStack(spacing: 8) {
                                            Image(systemName: platform.2)
                                                .font(.system(size: 20, weight: .medium))
                                                .foregroundStyle(
                                                    selectedPlatforms.contains(platform.0)
                                                    ? Theme.emerald.hexColor
                                                    : Theme.textDisabled.hexColor
                                                )
                                            
                                            Text(platform.1)
                                                .font(.custom(Theme.FontWeight.medium, size: 12))
                                                .foregroundStyle(
                                                    selectedPlatforms.contains(platform.0)
                                                    ? Theme.textPrimary.hexColor
                                                    : Theme.textDisabled.hexColor
                                                )
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 12)
                                        .background(
                                            selectedPlatforms.contains(platform.0)
                                            ? Theme.emerald.hexColor.opacity(0.15)
                                            : Color.white.opacity(0.04)
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(
                                                    selectedPlatforms.contains(platform.0)
                                                    ? Theme.emerald.hexColor.opacity(0.3)
                                                    : Color.clear,
                                                    lineWidth: 1
                                                )
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        
                        // Content Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Content")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                            
                            TextEditor(text: $content)
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                                .frame(height: 200)
                                .padding(16)
                                .background(.white.opacity(0.04))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(.white.opacity(0.05), lineWidth: 1)
                                )
                        }
                        
                        Button {
                            // Generate AI post
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 16, weight: .semibold))
                                
                                Text("Generate with AI")
                                    .font(.custom(Theme.FontWeight.semiBold, size: 16))
                            }
                            .foregroundStyle(Theme.emerald.hexColor)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(.white.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        
                        Button {
                            // Schedule post
                            dismiss()
                        } label: {
                            Text("Schedule Post")
                                .font(.custom(Theme.FontWeight.bold, size: 18))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(content.isEmpty ? Theme.textDisabled.hexColor : Theme.emerald.hexColor)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .disabled(content.isEmpty)
                    }
                    .padding(24)
                }
            }
            .navigationTitle("New Broadcast")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    SocialView()
}
