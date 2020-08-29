import { GetStaticPaths, GetStaticProps } from "next";
import React from "react";
import { PortfolioModel } from "../../types/server/PortfolioModel";
import { fetchEntriesData } from "../../logics/api/fetchEntriesData";

import { IndexContext, IndexContextType } from "../../contexts/IndexContext";
import BasePage from "../../components/base/BasePage";
import { TagType } from "../../types/TagType";
import DetailArticle from "../../components/detail/DetailArticle";
import { EntryType } from "../../types/EntryType";
import { MediumType } from "../../types/MediumType";
import { fetchOgInfo } from "../../logics/scraping/fetchOgInfo";
import { fetchMedia } from "../../logics/api/fetchMedia";
import { fetchTagList } from "../../logics/api/fetchTagList";

export const getStaticPaths: GetStaticPaths = async () => {
  // Get the paths we want to pre-render based on posts
  const portfolioData = await fetchEntriesData<PortfolioModel>("portfolio");
  const paths = portfolioData.items.map(
    (entry) => `/entry/${entry.fields.slug}`
  );
  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const targetSlug = params?.id as string;
  if (targetSlug == null) {
    return {
      props: {
        entryData: null,
      },
    };
  }

  const [entryData, mediumDataList, tagDataList]: [
    EntryType,
    MediumType[],
    TagType[]
  ] = await Promise.all([
    fetchEntriesData<PortfolioModel>("portfolio", {
      "fields.slug": targetSlug,
    }).then(async (dataList) => {
      const data = dataList.items[0];
      const tags: EntryType["tags"] = data.fields.tags.map(
        (tagEntry) => tagEntry.fields
      );
      const { ogImage, ogTitle } = await fetchOgInfo(data.fields.url);

      return {
        id: data.sys.id,
        ...data.fields,
        medium: data.fields.medium.fields,
        slide: data.fields.slide?.fields ?? null,
        ogInfo: {
          title: ogTitle,
          image: ogImage,
        },
        tags,
      } as EntryType;
    }),
    fetchMedia(),
    fetchTagList(),
  ]);

  return {
    props: {
      entryData,
      mediumDataList,
      tagDataList,
    },
  };
};

const DetailPage: React.FC<{
  entryData: EntryType;
  mediumDataList: MediumType[];
  tagDataList: TagType[];
}> = ({ entryData, mediumDataList, tagDataList }) => {
  const contextValue: IndexContextType = {
    mediumDataList,
    tagDataList,
  };

  return (
    <IndexContext.Provider value={contextValue}>
      <BasePage pageTitle={entryData.title}>
        <DetailArticle entryData={entryData} />
      </BasePage>
    </IndexContext.Provider>
  );
};

export default DetailPage;
