import { db, write } from "../src/config/database.ts";

if (process.env.NODE_ENV === "production") throw new Error("Development seed is disabled in production");

const garments = [
  {
    name: "Everyday Oxford Shirt",
    slug: "everyday-oxford-shirt",
    category: "shirts",
    price: "1890",
    image: "photo-1596755094514-f87e34085b2c",
    color: "Cloud",
    description: "A crisp cotton Oxford with a relaxed shape, button-down collar and softly curved hem. Made for everyday rotation.",
    discount: "10",
  },
  {
    name: "Essential Cotton Tee",
    slug: "essential-cotton-tee",
    category: "t-shirts",
    price: "790",
    image: "photo-1521572163474-6864f9cf17ab",
    color: "White",
    description: "A clean crew neck in soft cotton jersey. A regular fit with a ribbed collar and an easy, straight hem.",
    discount: "0",
  },
  {
    name: "Straight Leg Denim",
    slug: "straight-leg-denim",
    category: "denim",
    price: "2490",
    image: "photo-1542272604-787c3835535d",
    color: "Indigo",
    description: "Classic five-pocket denim with a straight leg and mid rise. A structured feel that softens with every wear.",
    discount: "0",
  },
  {
    name: "Textured Knit Sweater",
    slug: "textured-knit-sweater",
    category: "knitwear",
    price: "2290",
    image: "photo-1434389677669-e08b4cac3105",
    color: "Oat",
    description: "A tactile knit with a gentle drape, relaxed shoulders and ribbed trims. An understated layer for cooler days.",
    discount: "15",
  },
  {
    name: "Relaxed Tailored Trouser",
    slug: "relaxed-tailored-trouser",
    category: "trousers",
    price: "1990",
    image: "photo-1594633312681-425c7b97ccd1",
    color: "Black",
    description: "Easy tailoring with a relaxed leg, clean waistband and side pockets. A versatile foundation for a considered wardrobe.",
    discount: "0",
  },
  {
    name: "Everyday Utility Jacket",
    slug: "everyday-utility-jacket",
    category: "outerwear",
    price: "3490",
    image: "photo-1591047139829-d91aecb6caea",
    color: "Olive",
    description: "A lightweight utility layer with a button front, practical pockets and room to move. Wear open over your favourite tee.",
    discount: "10",
  },
];

try {
  for (const name of ["Shirts", "T-shirts", "Denim", "Knitwear", "Trousers", "Outerwear"]) {
    const slug = name.toLowerCase();
    await db.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }
  for (const garment of garments) {
    if (await db.product.findUnique({ where: { slug: garment.slug } })) continue;
    const category = await db.category.findUniqueOrThrow({
      where: { slug: garment.category },
    });
    await write(async (client) => {
      await client.product.create({
        data: {
          name: garment.name,
          slug: garment.slug,
          description: garment.description,
          categoryId: category.id,
          price: garment.price,
          discountPercentage: garment.discount,
          featured: true,
          status: "PUBLISHED",
          variants: {
            create: ["S", "M", "L", "XL"].map((size, index) => ({
              sku: `${garment.slug.toUpperCase()}-${size}`,
              name: `${garment.color} / ${size}`,
              attributes: { color: garment.color, size },
              isDefault: index === 1,
              price: size === "XL" ? String(Number(garment.price) + 100) : null,
            })),
          },
          images: {
            create: {
              imageUrl: `https://images.unsplash.com/${garment.image}?auto=format&fit=crop&w=1200&q=85`,
              publicId: `seed/${garment.slug}`,
              alt: garment.name,
              sortOrder: 0,
            },
          },
        },
      });
    });
  }
  console.log("Development clothing catalogue seeded. No admin credentials were created.");
} finally {
  await db.$disconnect();
}
