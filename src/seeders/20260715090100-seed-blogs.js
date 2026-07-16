'use strict';

// Migrates the 6 posts that used to be hardcoded in the customer frontend's
// data/blogs.js into the new admin-editable table, so the blog looks
// identical on first deploy of this feature. Images stay on placehold.co
// (never uploaded through the backend) until an admin replaces them with a
// real upload through the admin panel, matching the hero-slides seeder's
// approach for pre-existing content.
const now = new Date();
const authorAvatar = 'https://placehold.co/50x50/0B8B87/FFFFFF?text=TFY';
const authorName = 'Tapes For You Team';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('blogs', [
      {
        title: 'How to Choose the Right Adhesive Tape for Your Project',
        slug: 'how-to-choose-right-adhesive-tape',
        excerpt: "With so many types of adhesive tapes available, choosing the right one can be overwhelming. Here's a complete guide to help you pick the perfect tape for any job.",
        content: `
      <h2>Understanding Adhesive Tape Types</h2>
      <p>Adhesive tapes come in many varieties, each designed for specific applications. Understanding the differences can help you make the right choice.</p>

      <h3>1. Packing Tapes (BOPP)</h3>
      <p>BOPP (Biaxially Oriented Polypropylene) tape is the most common packaging tape. It's transparent, strong, and moisture-resistant. Perfect for sealing cartons and boxes for shipping.</p>

      <h3>2. Masking Tapes</h3>
      <p>Made from thin crepe paper, masking tape is easy to tear and remove without leaving residue. It's ideal for painting projects, where you need clean, sharp lines.</p>

      <h3>3. Double Sided Tapes</h3>
      <p>With adhesive on both sides, these tapes are used for mounting, bonding, and invisible joining. Great for posters, photos, and craft projects.</p>

      <h3>4. Foam Tapes</h3>
      <p>Foam tapes provide cushioning, sealing, and insulation. They conform to irregular surfaces and are excellent for weatherstripping doors and windows.</p>

      <h3>5. Specialty Tapes</h3>
      <p>This category includes electrical tape, duct tape, reflective tape, and more. Each is engineered for specific demanding applications.</p>

      <h2>Key Factors to Consider</h2>
      <ul>
        <li><strong>Surface type:</strong> Smooth, rough, porous, or non-porous</li>
        <li><strong>Temperature:</strong> Operating temperature range</li>
        <li><strong>Duration:</strong> Temporary or permanent bond</li>
        <li><strong>Load:</strong> Weight or stress the tape needs to handle</li>
        <li><strong>Environment:</strong> Indoor, outdoor, humid, or chemical exposure</li>
      </ul>
    `,
        image: 'https://placehold.co/800x450/DFF4F2/065F5B?text=Choosing+Tape',
        category: 'Guides',
        author_name: authorName,
        author_avatar: authorAvatar,
        published_date: '2025-12-15',
        read_time: '5 min read',
        tags: JSON.stringify(['guide', 'how-to', 'adhesive tape', 'tape selection']),
        seo_title: 'How to Choose the Right Adhesive Tape | Complete Guide | Tapes For You',
        seo_description: 'Learn how to select the perfect adhesive tape for your project. Expert guide covering packing tapes, masking tapes, foam tapes, and specialty tapes.',
        seo_keywords: JSON.stringify(['adhesive tape guide', 'how to choose tape', 'tape selection guide', 'types of adhesive tape']),
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'Benefits of Using Quality Packing Tape for Your Business',
        slug: 'benefits-quality-packing-tape-business',
        excerpt: 'Using the right packing tape can significantly impact your shipping operations. Discover why investing in quality tape pays off for your business.',
        content: `
      <h2>Why Quality Packing Tape Matters</h2>
      <p>In the world of shipping and logistics, the humble packing tape plays a crucial role. But not all tapes are created equal.</p>

      <h3>1. Reduced Returns and Damage</h3>
      <p>Quality BOPP tape maintains its adhesion through temperature fluctuations and humidity changes that occur during shipping. This means fewer damaged packages and returns.</p>

      <h3>2. Cost Efficiency</h3>
      <p>Premium tape actually saves money in the long run. Cheaper tape often requires double-taping or fails during transit, leading to higher overall costs.</p>

      <h3>3. Professional Appearance</h3>
      <p>Crystal clear packaging tape gives your packages a professional look that reflects well on your brand.</p>

      <h3>4. Worker Efficiency</h3>
      <p>High-quality tape with consistent adhesion and easy dispensing speeds up the packing process significantly.</p>
    `,
        image: 'https://placehold.co/800x450/E8F5E9/065F5B?text=Packing+Tape',
        category: 'Business',
        author_name: authorName,
        author_avatar: authorAvatar,
        published_date: '2025-11-28',
        read_time: '4 min read',
        tags: JSON.stringify(['packing tape', 'business', 'shipping', 'BOPP']),
        seo_title: 'Benefits of Quality Packing Tape for Business | Tapes For You',
        seo_description: 'Discover how quality packing tape can reduce shipping damage, save costs, and improve your business operations.',
        seo_keywords: JSON.stringify(['packing tape benefits', 'quality packing tape', 'business packing tape', 'BOPP tape benefits']),
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'Top 5 Creative Uses for Double Sided Tape',
        slug: 'top-5-uses-double-sided-tape',
        excerpt: 'Double sided tape is incredibly versatile beyond basic mounting. Explore these creative uses that will make your projects easier and more professional.',
        content: `
      <h2>Beyond Basic Mounting</h2>
      <p>Double sided tape is one of the most versatile tools in any home or office. Here are five creative uses you might not have considered.</p>

      <h3>1. Invisible Hem Fix</h3>
      <p>Use double sided tape to create a quick, invisible hem on curtains, pants, or skirts when you don't have time to sew.</p>

      <h3>2. Cable Management</h3>
      <p>Secure cables and wires neatly along walls or under desks using double sided foam tape for a clean, organized look.</p>

      <h3>3. Anti-Slip Rug Backing</h3>
      <p>Apply double sided tape under rugs to prevent sliding and create a safer floor surface, especially on hardwood floors.</p>

      <h3>4. Photo and Art Display</h3>
      <p>Create gallery walls without damaging your paint. Double sided foam tape creates space between the wall and the frame for a 3D effect.</p>

      <h3>5. Gift Wrapping</h3>
      <p>Create perfectly wrapped gifts with invisible seams using double sided tape instead of regular tape.</p>
    `,
        image: 'https://placehold.co/800x450/FCE4EC/880E4F?text=Double+Sided',
        category: 'Tips & Tricks',
        author_name: authorName,
        author_avatar: authorAvatar,
        published_date: '2025-11-10',
        read_time: '3 min read',
        tags: JSON.stringify(['double sided tape', 'creative uses', 'DIY', 'home', 'tips']),
        seo_title: 'Top 5 Creative Uses for Double Sided Tape | Tapes For You',
        seo_description: 'Discover creative uses for double sided tape beyond mounting. From cable management to invisible hems, learn versatile applications.',
        seo_keywords: JSON.stringify(['double sided tape uses', 'creative tape uses', 'DIY tape projects']),
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'Masking Tape in Paint Projects: A Complete Guide',
        slug: 'masking-tape-paint-projects-guide',
        excerpt: 'Getting clean paint lines requires the right masking tape and technique. This guide covers everything from tape selection to removal.',
        content: `
      <h2>Getting Perfect Paint Lines</h2>
      <p>A professional-looking paint job depends significantly on proper masking. Here's how to get it right.</p>

      <h3>Choosing the Right Masking Tape</h3>
      <p>For interior painting, standard masking tape works well. For delicate surfaces like fresh paint or wallpaper, use low-tack tape. For outdoor use or high temperatures, choose a premium grade tape rated for higher temperatures.</p>

      <h3>Proper Application Technique</h3>
      <ol>
        <li>Clean and dry the surface before applying tape</li>
        <li>Apply tape carefully along the line you want to protect</li>
        <li>Press the edge firmly to prevent paint bleed</li>
        <li>For walls, use a credit card to seal the edge</li>
        <li>Apply paint with a brush or roller inward toward the tape</li>
      </ol>

      <h3>When to Remove the Tape</h3>
      <p>The key question: remove tape while paint is wet or after it dries? For acrylic paints, remove while slightly wet for cleanest lines. Pull at a 45° angle away from the painted area.</p>
    `,
        image: 'https://placehold.co/800x450/FFF8E1/B8860B?text=Masking+Tape',
        category: 'Guides',
        author_name: authorName,
        author_avatar: authorAvatar,
        published_date: '2025-10-25',
        read_time: '6 min read',
        tags: JSON.stringify(['masking tape', 'painting', 'DIY', 'guide', 'interior design']),
        seo_title: 'Masking Tape for Paint Projects: Complete Guide | Tapes For You',
        seo_description: 'Learn how to use masking tape for perfect paint lines. Complete guide on tape selection, application, and removal techniques.',
        seo_keywords: JSON.stringify(['masking tape painting', 'paint masking guide', 'clean paint lines tape']),
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'How to Properly Store Adhesive Tapes for Maximum Shelf Life',
        slug: 'how-to-store-adhesive-tapes',
        excerpt: 'Improper storage can significantly reduce the effectiveness of adhesive tapes. Learn the best practices for storing your tape inventory.',
        content: `
      <h2>Proper Tape Storage</h2>
      <p>Adhesive tapes can lose their effectiveness if not stored correctly. Follow these guidelines to maximize shelf life.</p>

      <h3>Temperature Control</h3>
      <p>Store tapes at room temperature (15-25°C). Extreme heat causes adhesives to soften and ooze, while cold temperatures make them brittle.</p>

      <h3>Humidity</h3>
      <p>Keep humidity between 40-60%. High humidity can cause paper-backed tapes to absorb moisture and lose stiffness.</p>

      <h3>Light Exposure</h3>
      <p>UV light degrades many adhesives. Store tapes in a dark area or away from direct sunlight.</p>

      <h3>Position Matters</h3>
      <p>Store tape rolls on their side (cylindrical axis horizontal), not standing upright. This prevents the roll from flattening under its own weight.</p>

      <h3>Original Packaging</h3>
      <p>Keep tape in original packaging until use to protect from dust and contamination.</p>
    `,
        image: 'https://placehold.co/800x450/E8EAF6/3F51B5?text=Tape+Storage',
        category: 'Tips & Tricks',
        author_name: authorName,
        author_avatar: authorAvatar,
        published_date: '2025-10-05',
        read_time: '4 min read',
        tags: JSON.stringify(['tape storage', 'shelf life', 'maintenance', 'tips']),
        seo_title: 'How to Store Adhesive Tapes Properly | Maximize Shelf Life | Tapes For You',
        seo_description: 'Learn proper adhesive tape storage techniques to maximize shelf life and maintain adhesive effectiveness.',
        seo_keywords: JSON.stringify(['adhesive tape storage', 'how to store tape', 'tape shelf life']),
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        title: "Industrial vs Consumer Grade Tapes: What's the Difference?",
        slug: 'industrial-vs-consumer-grade-tapes',
        excerpt: 'Understanding the key differences between industrial and consumer grade adhesive tapes helps you make smarter purchasing decisions for your specific needs.',
        content: `
      <h2>Industrial vs Consumer Grade</h2>
      <p>Not all adhesive tapes are made equal. Here's how to distinguish between industrial and consumer grade products.</p>

      <h3>Adhesive Strength</h3>
      <p>Industrial tapes use high-performance acrylic or rubber-based adhesives with significantly higher tack and peel strength. Consumer tapes use lighter formulations.</p>

      <h3>Backing Material</h3>
      <p>Industrial tapes use thicker, more durable backings. Consumer tapes use thinner materials optimized for cost and ease of use.</p>

      <h3>Temperature Range</h3>
      <p>Industrial tapes operate in extreme temperatures (-40°C to 150°C+). Consumer tapes are designed for normal room temperature applications.</p>

      <h3>When to Use Industrial Grade</h3>
      <ul>
        <li>High-stress applications</li>
        <li>Outdoor or extreme environment use</li>
        <li>Long-term permanent bonds</li>
        <li>Heavy loads or vibration</li>
      </ul>
    `,
        image: 'https://placehold.co/800x450/ECEFF1/37474F?text=Industrial+Tape',
        category: 'Education',
        author_name: authorName,
        author_avatar: authorAvatar,
        published_date: '2025-09-18',
        read_time: '5 min read',
        tags: JSON.stringify(['industrial tape', 'consumer tape', 'tape comparison', 'buying guide']),
        seo_title: 'Industrial vs Consumer Grade Adhesive Tapes | Tapes For You',
        seo_description: 'Compare industrial and consumer grade adhesive tapes. Learn key differences in strength, temperature range, and when to use each type.',
        seo_keywords: JSON.stringify(['industrial tape', 'consumer tape comparison', 'industrial vs consumer tape', 'tape buying guide']),
        status: 'published',
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('blogs', null, {});
  },
};
