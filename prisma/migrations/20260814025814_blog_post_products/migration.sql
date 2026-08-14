-- CreateTable
CREATE TABLE "blog_post_products" (
    "id" TEXT NOT NULL,
    "blogPostId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "affiliateLinkId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_post_products_blogPostId_order_idx" ON "blog_post_products"("blogPostId", "order");

-- CreateIndex
CREATE INDEX "blog_post_products_productId_idx" ON "blog_post_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_products_blogPostId_productId_key" ON "blog_post_products"("blogPostId", "productId");

-- AddForeignKey
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_products" ADD CONSTRAINT "blog_post_products_affiliateLinkId_fkey" FOREIGN KEY ("affiliateLinkId") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
