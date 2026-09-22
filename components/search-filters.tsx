import { listBrands, listNiches, listStores } from "@/lib/catalog";
import { asList, asText, type RawParams } from "@/lib/query";

/**
 * Filters are plain GET form controls so the state lives in the URL: shareable,
 * indexable-by-choice and usable without JavaScript.
 */
export async function SearchFilters({ params, action = "/busca" }: { params: RawParams; action?: string }) {
  const [niches, brands, stores] = await Promise.all([listNiches(), listBrands(), listStores()]);
  const term = asText(params.q);
  const selectedCategories = asList(params.categoria);
  const selectedBrands = asList(params.marca);
  const selectedStores = asList(params.loja);
  const availableOnly = asText(params.disponivel) === "1";

  return (
    <form
      action={action}
      method="get"
      aria-label="Filtros da busca"
      className="flex flex-col gap-5 rounded-[14px] border border-line bg-surface p-5"
    >
      {term ? <input type="hidden" name="q" value={term} /> : null}

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Filtros</span>
        <a href={term ? `${action}?q=${encodeURIComponent(term)}` : action} className="text-xs font-semibold text-brand">
          Limpar filtros
        </a>
      </div>

      <FilterGroup legend="Nicho">
        {niches.map((category) => (
          <Checkbox
            key={category.slug}
            name="categoria"
            value={category.slug}
            label={category.name}
            defaultChecked={selectedCategories.includes(category.slug)}
          />
        ))}
      </FilterGroup>

      <Divider />

      <FilterGroup legend="Marca">
        {brands.slice(0, 12).map((brand) => (
          <Checkbox
            key={brand}
            name="marca"
            value={brand}
            label={brand}
            defaultChecked={selectedBrands.includes(brand)}
          />
        ))}
      </FilterGroup>

      <Divider />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Faixa de preço
        </legend>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">Preço mínimo</span>
            <input
              name="min"
              inputMode="decimal"
              defaultValue={asText(params.min)}
              placeholder="R$ mín"
              className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none placeholder:text-muted focus:border-brand"
            />
          </label>
          <label className="flex-1">
            <span className="sr-only">Preço máximo</span>
            <input
              name="max"
              inputMode="decimal"
              defaultValue={asText(params.max)}
              placeholder="R$ máx"
              className="w-full rounded-lg border border-line px-2.5 py-2 text-[13px] outline-none placeholder:text-muted focus:border-brand"
            />
          </label>
        </div>
      </fieldset>

      <Divider />

      <FilterGroup legend="Lojas">
        {stores.map((store) => (
          <Checkbox
            key={store.id}
            name="loja"
            value={store.id}
            label={store.name}
            defaultChecked={selectedStores.includes(store.id)}
          />
        ))}
      </FilterGroup>

      <Divider />

      <Checkbox
        name="disponivel"
        value="1"
        label="Somente com oferta atual"
        defaultChecked={availableOnly}
      />

      <button
        type="submit"
        className="h-11 rounded-[10px] bg-brand text-sm font-semibold text-surface transition-colors hover:bg-brand-dark"
      >
        Aplicar filtros
      </button>
    </form>
  );
}

function FilterGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function Checkbox({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 text-[13px]">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-[15px] w-[15px] accent-brand"
      />
      {label}
    </label>
  );
}

function Divider() {
  return <div className="h-px bg-line" aria-hidden />;
}
