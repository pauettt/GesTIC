import ChromebooksPage from "../page";

export const metadata = { title: "Llistat de carros" };

export default async function ChromebooksListPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const wrappedSearchParams = Promise.resolve({
    ...params,
    vista: "llistat",
  });

  return (
    <ChromebooksPage
      params={Promise.resolve({})}
      searchParams={wrappedSearchParams}
    />
  );
}
