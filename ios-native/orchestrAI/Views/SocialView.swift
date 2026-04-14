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
