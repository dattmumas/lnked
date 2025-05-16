import React from "react";

// TODO: Implement fetching and applying collective-specific theme values (Rule 5.2)
// Example: Fetch collective data by slug, extract theme (e.g., primaryColor, coverImageUrl)
// and apply them as CSS variables to a wrapper div or via a <style> tag.

export default async function CollectiveSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { collectiveSlug: string };
}) {
  // console.log("Collective slug:", params.collectiveSlug); // Temporary: to use params
  // const collectiveTheme = await fetchCollectiveTheme(params.collectiveSlug);
  // const style = collectiveTheme ? {
  //   '--collective-primary-color': collectiveTheme.primaryColor,
  //   '--collective-cover-image': `url(${collectiveTheme.coverImageUrl})`,
  // } : {};

  // Using params to avoid lint error, will be used properly when fetching theme
  if (process.env.NODE_ENV === "development") {
    console.log("Rendering layout for collective slug:", params.collectiveSlug);
  }

  return (
    // <div style={style as React.CSSProperties}>
    <>{children}</> // Simplest pass-through for now
    // </div>
  );
}
