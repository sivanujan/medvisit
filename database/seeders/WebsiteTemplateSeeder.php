<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\WebsiteTemplate;
use Illuminate\Database\Seeder;

class WebsiteTemplateSeeder extends Seeder
{
    /**
     * Seed initial templates (5 free presets + 5 premium animated templates).
     */
    public function run(): void
    {
        // 1. FREE PRESET THEMES (Keep free tier available to all)
        $freePresets = [
            [
                'slug' => 'medvisit-teal',
                'name' => 'MedVisit Teal',
                'tagline' => 'Trustworthy & clinical with fresh turquoise accents',
                'description' => 'Clean, balanced clinical standard for outpatient healthcare centers with crisp contrast.',
                'tier' => WebsiteTemplate::TIER_FREE,
                'price_cents' => 0,
                'tags' => ['Free', 'Clinical', 'Standard'],
                'sort_order' => 1,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'medvisit-teal',
                        'mode' => 'light',
                        'font' => 'poppins',
                        'hero_style' => 'gradient',
                        'button_style' => 'rounded',
                        'brand_color' => '#0E9E8F',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'gradient', 'badge_style' => 'pill'],
                        'doctors' => ['layout' => 'grid', 'limit' => 6],
                        'sessions' => ['layout' => 'cards', 'limit' => 6],
                        'hours' => ['layout' => 'list'],
                    ],
                    'animation_preset' => ['entrance' => 'none'],
                ],
            ],
            [
                'slug' => 'ocean-blue',
                'name' => 'Ocean Blue',
                'tagline' => 'Professional medical standard, calm & authoritative',
                'description' => 'Authoritative medical blue palette providing serene reassurance for patients and channeling.',
                'tier' => WebsiteTemplate::TIER_FREE,
                'price_cents' => 0,
                'tags' => ['Free', 'Medical', 'Calm'],
                'sort_order' => 2,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'ocean-blue',
                        'mode' => 'light',
                        'font' => 'poppins',
                        'hero_style' => 'gradient',
                        'button_style' => 'rounded',
                        'brand_color' => '#1E6FD9',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'gradient'],
                        'doctors' => ['layout' => 'grid'],
                        'sessions' => ['layout' => 'cards'],
                    ],
                    'animation_preset' => ['entrance' => 'none'],
                ],
            ],
            [
                'slug' => 'emerald-health',
                'name' => 'Emerald Health',
                'tagline' => 'Healing & natural vitality for family care and wellness',
                'description' => 'Organic wellness palette with soothing emerald tones for family practices.',
                'tier' => WebsiteTemplate::TIER_FREE,
                'price_cents' => 0,
                'tags' => ['Free', 'Wellness', 'Green'],
                'sort_order' => 3,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'emerald-health',
                        'mode' => 'light',
                        'font' => 'nunito',
                        'hero_style' => 'gradient',
                        'button_style' => 'rounded',
                        'brand_color' => '#059669',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'gradient'],
                        'doctors' => ['layout' => 'grid'],
                        'sessions' => ['layout' => 'cards'],
                    ],
                    'animation_preset' => ['entrance' => 'none'],
                ],
            ],
            [
                'slug' => 'royal-purple',
                'name' => 'Royal Purple',
                'tagline' => 'Specialist consultant suites and premium healthcare',
                'description' => 'Prestigious consultant chambers aesthetic with rich violet highlights and sleek styling.',
                'tier' => WebsiteTemplate::TIER_FREE,
                'price_cents' => 0,
                'tags' => ['Free', 'Specialist', 'Purple'],
                'sort_order' => 4,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'royal-purple',
                        'mode' => 'light',
                        'font' => 'poppins',
                        'hero_style' => 'gradient',
                        'button_style' => 'rounded',
                        'brand_color' => '#7C3AED',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'gradient'],
                        'doctors' => ['layout' => 'grid'],
                        'sessions' => ['layout' => 'cards'],
                    ],
                    'animation_preset' => ['entrance' => 'none'],
                ],
            ],
            [
                'slug' => 'slate-luxury',
                'name' => 'Slate Luxury',
                'tagline' => 'Minimalist high-contrast aesthetic with sophisticated depth',
                'description' => 'Monochrome high-contrast design for modern diagnostics, imaging centers, and dental studios.',
                'tier' => WebsiteTemplate::TIER_FREE,
                'price_cents' => 0,
                'tags' => ['Free', 'Minimal', 'Slate'],
                'sort_order' => 5,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'slate-luxury',
                        'mode' => 'light',
                        'font' => 'poppins',
                        'hero_style' => 'minimal',
                        'button_style' => 'rounded',
                        'brand_color' => '#334155',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'minimal'],
                        'doctors' => ['layout' => 'grid'],
                        'sessions' => ['layout' => 'cards'],
                    ],
                    'animation_preset' => ['entrance' => 'none'],
                ],
            ],
        ];

        foreach ($freePresets as $preset) {
            WebsiteTemplate::updateOrCreate(
                ['slug' => $preset['slug']],
                array_merge($preset, [
                    'is_active' => true,
                    'version' => '1.0.0',
                    'supports' => ['section_editor', 'page_builder'],
                    'changelog' => [['version' => '1.0.0', 'date' => '2026-10-28', 'notes' => 'Initial release']],
                    'preview_images' => ['/images/templates/'.$preset['slug'].'-preview.webp'],
                ])
            );
        }

        // 2. FIVE PREMIUM TEMPLATES (Rs. 3,500 base price = 350000 cents)
        $premiumTemplates = [
            [
                'slug' => 'serene',
                'name' => 'Serene',
                'tagline' => 'Calm, airy elegance with soft teal gradients & floating cards',
                'description' => 'Designed for modern wellness clinics and multi-disciplinary centers. Features gentle parallax hero depth, glassmorphism card elevation, floating doctor avatars, and silky smooth reveal animations.',
                'tier' => WebsiteTemplate::TIER_PREMIUM,
                'price_cents' => 350000,
                'tags' => ['Animated', 'Parallax', 'Teal', 'Wellness', 'Modern'],
                'sort_order' => 10,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'medvisit-teal',
                        'mode' => 'light',
                        'font' => 'poppins',
                        'hero_style' => 'gradient',
                        'button_style' => 'pill',
                        'brand_color' => '#0E9E8F',
                        'glassmorphism' => true,
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'parallax_cards', 'badge' => 'Verified Medical Practice', 'floating_pill' => true],
                        'about' => ['variant' => 'side_by_side_glass'],
                        'doctors' => ['variant' => 'elevated_cards', 'hover_lift' => true, 'layout' => 'grid'],
                        'sessions' => ['variant' => 'pill_timeline', 'layout' => 'cards'],
                        'hours' => ['variant' => 'compact_cards'],
                        'contact' => ['variant' => 'card_with_map'],
                    ],
                    'animation_preset' => [
                        'entrance' => 'fade-up',
                        'stagger_ms' => 120,
                        'reveal_observer' => true,
                        'hero_parallax' => true,
                    ],
                    'custom_css' => '
                        .mv-template-serene .medvisit-card {
                            backdrop-filter: blur(16px);
                            transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease;
                        }
                        .mv-template-serene .medvisit-card:hover {
                            transform: translateY(-4px);
                            box-shadow: 0 20px 35px -10px rgba(14, 158, 143, 0.15);
                        }
                    ',
                ],
            ],
            [
                'slug' => 'specialist',
                'name' => 'Specialist',
                'tagline' => 'Commanding dark hero with interactive doctor grid & live session timeline',
                'description' => 'Tailored for consultant chambers, surgical suites, and multi-specialty channeling centers. Features high-contrast dark hero, animated doctor specialties filter, live session timeline with "Now in progress" indicator, and bold channeling CTA.',
                'tier' => WebsiteTemplate::TIER_PREMIUM,
                'price_cents' => 350000,
                'tags' => ['Specialist', 'Dark Mode', 'Timeline', 'Animated', 'Channeling'],
                'sort_order' => 20,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'royal-purple',
                        'mode' => 'dark',
                        'font' => 'poppins',
                        'hero_style' => 'split',
                        'button_style' => 'rounded',
                        'brand_color' => '#7C3AED',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'split_dark_consultant', 'accent_badge' => 'Specialist Chambers'],
                        'about' => ['variant' => 'stats_prominent'],
                        'doctors' => ['variant' => 'specialist_grid', 'show_slmc' => true, 'layout' => 'grid'],
                        'sessions' => ['variant' => 'live_timeline', 'show_now_marker' => true, 'layout' => 'cards'],
                        'hours' => ['variant' => 'dark_schedule'],
                        'contact' => ['variant' => 'executive_suite'],
                    ],
                    'animation_preset' => [
                        'entrance' => 'fade-up',
                        'stagger_ms' => 100,
                        'reveal_observer' => true,
                    ],
                    'custom_css' => '
                        .mv-template-specialist {
                            --template-glow: 0 0 25px rgba(124, 58, 237, 0.3);
                        }
                        .mv-template-specialist .doctor-badge {
                            border-color: rgba(167, 139, 250, 0.4);
                        }
                        .mv-template-specialist .now-marker {
                            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                        }
                    ',
                ],
            ],
            [
                'slug' => 'family-care',
                'name' => 'Family Care',
                'tagline' => 'Warm, welcoming curves with animated clock & illustrated icons',
                'description' => 'Built for neighborhood family practices and pediatric clinics. Features friendly rounded curves, an interactive animated clinic clock showing current Open/Closed status, approachable doctor cards, and comforting medical icons.',
                'tier' => WebsiteTemplate::TIER_PREMIUM,
                'price_cents' => 350000,
                'tags' => ['Family', 'Pediatrics', 'Animated Clock', 'Warm', 'Friendly'],
                'sort_order' => 30,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'emerald-health',
                        'mode' => 'light',
                        'font' => 'nunito',
                        'hero_style' => 'gradient',
                        'button_style' => 'pill',
                        'brand_color' => '#059669',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'friendly_family', 'soft_blobs' => true],
                        'about' => ['variant' => 'approachable_story'],
                        'doctors' => ['variant' => 'friendly_cards', 'avatar_ring' => true, 'layout' => 'grid'],
                        'sessions' => ['variant' => 'soft_pill_sessions', 'layout' => 'cards'],
                        'hours' => ['variant' => 'animated_clock_widget', 'show_live_status' => true],
                        'contact' => ['variant' => 'warm_neighborhood'],
                    ],
                    'animation_preset' => [
                        'entrance' => 'zoom-in',
                        'stagger_ms' => 150,
                        'reveal_observer' => true,
                    ],
                    'custom_css' => '
                        .mv-template-family-care .rounded-family {
                            border-radius: 28px;
                        }
                        .mv-template-family-care .clock-tick {
                            transform-origin: center;
                            animation: rotate 60s linear infinite;
                        }
                    ',
                ],
            ],
            [
                'slug' => 'heritage',
                'name' => 'Heritage',
                'tagline' => 'Architectural refinement with subtle kolam line art & timeless typography',
                'description' => 'Inspired by northern Sri Lankan architectural motifs and intricate geometry. Features subtle SVG kolam pattern accents (tastefully non-stereotypical), Playfair Display editorial serif paired with Poppins, warm bronze tones, and dignified doctor profiles.',
                'tier' => WebsiteTemplate::TIER_PREMIUM,
                'price_cents' => 350000,
                'tags' => ['Heritage', 'Serif', 'Cultural', 'Architectural', 'Refined'],
                'sort_order' => 40,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'slate-luxury',
                        'mode' => 'light',
                        'font' => 'serif',
                        'hero_style' => 'minimal',
                        'button_style' => 'rounded',
                        'brand_color' => '#854D0E',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'heritage_lineart', 'kolam_accent' => true],
                        'about' => ['variant' => 'classic_editorial'],
                        'doctors' => ['variant' => 'dignified_portraits', 'layout' => 'grid'],
                        'sessions' => ['variant' => 'classic_table', 'layout' => 'cards'],
                        'hours' => ['variant' => 'heritage_hours'],
                        'contact' => ['variant' => 'traditional_center'],
                    ],
                    'animation_preset' => [
                        'entrance' => 'fade-in',
                        'stagger_ms' => 80,
                        'reveal_observer' => true,
                    ],
                    'custom_css' => "
                        .mv-template-heritage h1, .mv-template-heritage h2, .mv-template-heritage .font-serif {
                            font-family: 'Playfair Display', Georgia, serif;
                            letter-spacing: -0.01em;
                        }
                        .mv-template-heritage .kolam-border {
                            border-image: linear-gradient(to right, transparent, #854D0E, transparent) 1;
                        }
                    ",
                ],
            ],
            [
                'slug' => 'dental-eye',
                'name' => 'Dental & Eye',
                'tagline' => 'Ultra-crisp clinical white & cyan with micro-interactions & before-visit guidance',
                'description' => 'Crafted specifically for dental clinics, ophthalmology suites, and modern diagnostic studios. Features crisp clinical cyan and ice blue, interactive before-visit preparation checklist, service cards with hover tilt, and FAQ accordion.',
                'tier' => WebsiteTemplate::TIER_PREMIUM,
                'price_cents' => 350000,
                'tags' => ['Dental', 'Eye Care', 'Clinical', 'Micro-interactions', 'FAQ'],
                'sort_order' => 50,
                'definition' => [
                    'theme_tokens' => [
                        'theme' => 'ocean-blue',
                        'mode' => 'light',
                        'font' => 'poppins',
                        'hero_style' => 'photo',
                        'button_style' => 'rounded',
                        'brand_color' => '#0284C7',
                    ],
                    'section_variants' => [
                        'hero' => ['variant' => 'clinical_split', 'micro_badges' => ['Digital Diagnostics', 'Sterilized Suites']],
                        'about' => ['variant' => 'procedure_walkthrough'],
                        'doctors' => ['variant' => 'practitioner_cards', 'layout' => 'grid'],
                        'sessions' => ['variant' => 'appointment_slots', 'layout' => 'cards'],
                        'services' => ['variant' => 'interactive_tiles'],
                        'hours' => ['variant' => 'clean_status'],
                        'contact' => ['variant' => 'navigation_suite'],
                    ],
                    'animation_preset' => [
                        'entrance' => 'fade-up',
                        'stagger_ms' => 100,
                        'reveal_observer' => true,
                    ],
                    'custom_css' => '
                        .mv-template-dental-eye .service-tile {
                            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        }
                        .mv-template-dental-eye .service-tile:hover {
                            border-color: #0284C7;
                            transform: translateY(-2px);
                        }
                    ',
                ],
            ],
        ];

        foreach ($premiumTemplates as $tmpl) {
            WebsiteTemplate::updateOrCreate(
                ['slug' => $tmpl['slug']],
                array_merge($tmpl, [
                    'is_active' => true,
                    'version' => '1.0.0',
                    'supports' => ['section_editor', 'page_builder'],
                    'changelog' => [['version' => '1.0.0', 'date' => '2026-10-28', 'notes' => 'Initial release']],
                    'preview_images' => ['/images/templates/'.$tmpl['slug'].'-preview.webp'],
                ])
            );
        }
    }
}
