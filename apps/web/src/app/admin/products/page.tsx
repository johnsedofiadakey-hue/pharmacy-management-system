"use client";

import { useEffect, useState } from "react";
import {
  createCategory,
  createProduct,
  listCategories,
  listProducts,
  updateProductMerchandising,
  updateProductPricing,
  setProductActive,
  type Category,
  type PrescriptionClassification,
  type Product,
} from "@/lib/firebase/callables";
import { Alert, Badge, Button } from "@/components/ui";

const classifications: PrescriptionClassification[] = ["OTC", "POM", "RESTRICTED"];

type PriceDraft = {
  costPrice: string;
  retailPrice: string;
  minSellingPrice: string;
};

type MerchandisingDraft = {
  genericName: string;
  brandName: string;
  categoryId: string;
  storefrontCategoryName: string;
  storefrontImageUrl: string;
};

function numberOrUndefined(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
  const [merchDrafts, setMerchDrafts] = useState<Record<string, MerchandisingDraft>>({});
  const [categoryForm, setCategoryForm] = useState({ name: "", parentCategoryId: "" });
  const [form, setForm] = useState({
    name: "",
    genericName: "",
    brandName: "",
    barcode: "",
    categoryId: "",
    retailPrice: "",
    reorderLevel: "",
    prescriptionClassification: "OTC" as PrescriptionClassification,
  });

  async function refresh() {
    try {
      const [productResult, categoryResult] = await Promise.all([
        listProducts({ includeInactive: true }),
        listCategories(),
      ]);
      setProducts(productResult.data.products);
      setCategories(categoryResult.data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      await createProduct({
        name: form.name,
        genericName: form.genericName || undefined,
        brandName: form.brandName || undefined,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId || undefined,
        retailPrice: numberOrUndefined(form.retailPrice),
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        prescriptionClassification: form.prescriptionClassification,
      });
      setForm({
        name: "",
        genericName: "",
        brandName: "",
        barcode: "",
        categoryId: "",
        retailPrice: "",
        reorderLevel: "",
        prescriptionClassification: "OTC",
      });
      setMessage("Product created.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    setCreatingCategory(true);
    setError(null);
    setMessage(null);
    try {
      await createCategory({
        name: categoryForm.name,
        parentCategoryId: categoryForm.parentCategoryId || undefined,
      });
      setCategoryForm({ name: "", parentCategoryId: "" });
      setMessage("Category created.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleUpdatePricing(product: Product) {
    const draft = priceDrafts[product.id];
    if (!draft) return;
    setError(null);
    setMessage(null);
    try {
      await updateProductPricing({
        productId: product.id,
        costPrice: numberOrUndefined(draft.costPrice),
        retailPrice: numberOrUndefined(draft.retailPrice),
        minSellingPrice: numberOrUndefined(draft.minSellingPrice),
      });
      setMessage(`Pricing updated for ${product.name}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update pricing.");
    }
  }

  async function handleUpdateMerchandising(product: Product) {
    const draft = merchDrafts[product.id];
    if (!draft) return;
    setError(null);
    setMessage(null);
    try {
      await updateProductMerchandising({
        productId: product.id,
        genericName: draft.genericName || null,
        brandName: draft.brandName || null,
        categoryId: draft.categoryId || null,
        storefrontCategoryName: draft.storefrontCategoryName || null,
        storefrontImageUrl: draft.storefrontImageUrl || null,
      });
      setMessage(`Storefront display updated for ${product.name}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update storefront display.");
    }
  }

  async function handleToggleActive(product: Product) {
    setError(null);
    setMessage(null);
    try {
      await setProductActive({ productId: product.id, isActive: !product.isActive });
      setMessage(`${product.name} ${product.isActive ? "removed from active catalogue" : "restored to active catalogue"}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product status.");
    }
  }

  function patchDraft(product: Product, patch: Partial<PriceDraft>) {
    setPriceDrafts((prev) => ({
      ...prev,
      [product.id]: {
        costPrice: prev[product.id]?.costPrice ?? product.costPrice ?? "",
        retailPrice: prev[product.id]?.retailPrice ?? product.retailPrice ?? "",
        minSellingPrice: prev[product.id]?.minSellingPrice ?? product.minSellingPrice ?? "",
        ...patch,
      },
    }));
  }

  function merchDefaults(product: Product): MerchandisingDraft {
    return {
      genericName: product.genericName ?? "",
      brandName: product.brandName ?? "",
      categoryId: product.categoryId ?? "",
      storefrontCategoryName: product.storefrontCategoryName ?? "",
      storefrontImageUrl: product.storefrontImageUrl ?? "",
    };
  }

  function patchMerchDraft(product: Product, patch: Partial<MerchandisingDraft>) {
    setMerchDrafts((prev) => ({
      ...prev,
      [product.id]: {
        ...(prev[product.id] ?? merchDefaults(product)),
        ...patch,
      },
    }));
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Products & pricing</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Control the shared catalogue and pricing rules used by every branch, POS, and storefront.
        </p>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {message && <Alert tone="success" className="mb-4">{message}</Alert>}

      <div className="mb-8 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <form onSubmit={handleCreate} className="clinical-card grid gap-3 rounded-xl p-5 md:grid-cols-3">
          <h2 className="font-semibold text-[color:var(--secondary)] md:col-span-3">Add product</h2>
          <input
            required
            className="field px-3 py-2"
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="field px-3 py-2"
            placeholder="Generic name"
            value={form.genericName}
            onChange={(e) => setForm({ ...form, genericName: e.target.value })}
          />
          <input
            className="field px-3 py-2"
            placeholder="Brand name"
            value={form.brandName}
            onChange={(e) => setForm({ ...form, brandName: e.target.value })}
          />
          <input
            className="field px-3 py-2"
            placeholder="Barcode / SKU"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <select
            className="field px-3 py-2"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="field px-3 py-2"
            value={form.prescriptionClassification}
            onChange={(e) =>
              setForm({ ...form, prescriptionClassification: e.target.value as PrescriptionClassification })
            }
          >
            {classifications.map((classification) => (
              <option key={classification} value={classification}>
                {classification}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step="0.01"
            className="field px-3 py-2"
            placeholder="Retail price"
            value={form.retailPrice}
            onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
          />
          <input
            type="number"
            min={0}
            className="field px-3 py-2"
            placeholder="Reorder level"
            value={form.reorderLevel}
            onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
          />
          <Button type="submit" disabled={creating} className="md:col-span-3">
            {creating ? "Creating..." : "Create product"}
          </Button>
        </form>

        <form onSubmit={handleCreateCategory} className="clinical-card flex flex-col gap-3 rounded-xl p-5">
          <div>
            <h2 className="font-semibold text-[color:var(--secondary)]">Categories</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              These power storefront tabs and cleaner admin reporting.
            </p>
          </div>
          <input
            required
            className="field px-3 py-2"
            placeholder="Category name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <select
            className="field px-3 py-2"
            value={categoryForm.parentCategoryId}
            onChange={(e) => setCategoryForm({ ...categoryForm, parentCategoryId: e.target.value })}
          >
            <option value="">Top-level category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                Under {category.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={creatingCategory}>
            {creatingCategory ? "Creating..." : "Create category"}
          </Button>
          <div className="mt-1 flex flex-wrap gap-2">
            {categories.slice(0, 12).map((category) => (
              <Badge key={category.id} tone="neutral">
                {category.name} {category._count ? `(${category._count.products})` : ""}
              </Badge>
            ))}
          </div>
        </form>
      </div>

      <section className="clinical-card rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-[color:var(--secondary)]">Catalogue</h2>
          <Badge tone="info">{products.length} products</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Storefront</th>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Retail</th>
                <th className="px-3 py-2 font-medium">Min price</th>
                <th className="px-3 py-2 font-medium">Cost</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const draft = priceDrafts[product.id] ?? {
                  costPrice: product.costPrice ?? "",
                  retailPrice: product.retailPrice ?? "",
                  minSellingPrice: product.minSellingPrice ?? "",
                };
                const merchDraft = merchDrafts[product.id] ?? merchDefaults(product);
                return (
                  <tr key={product.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-3 py-3">
                      <div className="font-medium text-[color:var(--secondary)]">{product.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">{product.category?.name ?? product.barcode ?? "Uncategorised"}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {product.isShowcase && <Badge tone="info">Showcase</Badge>}
                        {!product.isActive && <Badge tone="danger">Inactive</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="grid min-w-[360px] gap-2 md:grid-cols-2">
                        <input
                          className="field px-2 py-1"
                          placeholder="Generic name"
                          value={merchDraft.genericName}
                          onChange={(e) => patchMerchDraft(product, { genericName: e.target.value })}
                        />
                        <input
                          className="field px-2 py-1"
                          placeholder="Brand name"
                          value={merchDraft.brandName}
                          onChange={(e) => patchMerchDraft(product, { brandName: e.target.value })}
                        />
                        <select
                          className="field px-2 py-1"
                          value={merchDraft.categoryId}
                          onChange={(e) => patchMerchDraft(product, { categoryId: e.target.value })}
                        >
                          <option value="">No category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="field px-2 py-1"
                          placeholder="Storefront tab label"
                          value={merchDraft.storefrontCategoryName}
                          onChange={(e) => patchMerchDraft(product, { storefrontCategoryName: e.target.value })}
                        />
                        <input
                          className="field px-2 py-1 md:col-span-2"
                          placeholder="Image URL for product card"
                          value={merchDraft.storefrontImageUrl}
                          onChange={(e) => patchMerchDraft(product, { storefrontImageUrl: e.target.value })}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={product.prescriptionClassification === "OTC" ? "safe" : "warn"}>
                        {product.prescriptionClassification}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="field w-28 px-2 py-1"
                        value={draft.retailPrice}
                        onChange={(e) => patchDraft(product, { retailPrice: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="field w-28 px-2 py-1"
                        value={draft.minSellingPrice}
                        onChange={(e) => patchDraft(product, { minSellingPrice: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="field w-28 px-2 py-1"
                        value={draft.costPrice}
                        onChange={(e) => patchDraft(product, { costPrice: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleUpdatePricing(product)}
                        className="btn-secondary mb-2 block px-3 py-1.5 text-xs"
                      >
                        Save pricing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateMerchandising(product)}
                        className="btn-secondary mb-2 block px-3 py-1.5 text-xs"
                      >
                        Save display
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(product)}
                        className={
                          product.isActive
                            ? "btn-secondary px-3 py-1.5 text-xs text-[color:var(--danger)]"
                            : "btn-secondary px-3 py-1.5 text-xs"
                        }
                      >
                        {product.isActive ? (product.isShowcase ? "Remove showcase" : "Deactivate") : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
