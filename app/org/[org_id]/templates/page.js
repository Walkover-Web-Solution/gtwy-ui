"use client";

import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "@/components/layoutComponents/MainLayout";
import PageHeader from "@/components/Pageheader";
import LoadingSpinner from "@/components/LoadingSpinner";
import SearchItems from "@/components/UI/SearchItems";
import { getTemplates } from "@/config/templateApi";
import { formatDate, formatRelativeTime } from "@/utils/utility";

export const runtime = "edge";

const coerceArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value?.data && Array.isArray(value.data)) return value.data;
  return [];
};

const getTemplateTitle = (tpl) => tpl?.name || tpl?.title || tpl?.template_name || "Untitled Template";

const getTemplateDescription = (tpl) =>
  tpl?.description || tpl?.summary || tpl?.template_description || "No description available";

const getTemplatePreview = (tpl) => {
  const raw = tpl?.content || tpl?.prompt || tpl?.template || tpl?.body || "";
  if (typeof raw !== "string") return "";
  return raw.trim();
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchTemplates = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await getTemplates();
        const list = (coerceArray(res?.data) || []).map((tpl) => ({
          ...tpl,
          // normalize for shared components like SearchItems
          name: tpl?.name || tpl?.title || tpl?.template_name || tpl?.templateName || tpl?.slugName,
        }));
        if (!mounted) return;
        setTemplates(list);
        setFilteredTemplates(list);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
        if (!mounted) return;
        setError("Failed to load templates. Please try again.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchTemplates();
    return () => {
      mounted = false;
    };
  }, []);

  const showSearch = useMemo(() => (filteredTemplates?.length || 0) > 5, [filteredTemplates?.length]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-2">
          <PageHeader title="Templates" description="Browse and manage your reusable templates." />
        </div>

        {error ? (
          <div className="mt-6 alert alert-error">
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex flex-row gap-4 mt-4">
          {showSearch && <SearchItems data={templates || []} setFilterItems={setFilteredTemplates} item="Template" />}
        </div>

        {filteredTemplates?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-6">
            {filteredTemplates.map((tpl, idx) => {
              const preview = getTemplatePreview(tpl);
              return (
                <div
                  key={tpl?._id || tpl?.id || idx}
                  className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-200 group"
                >
                  <div className="h-32 bg-base-200 border-b border-base-300 relative overflow-hidden">
                    {preview ? (
                      <div className="absolute inset-0 p-3 text-xs text-base-content/80 overflow-hidden">
                        <pre className="whitespace-pre-wrap leading-5 line-clamp-6">
                          {preview.length > 240 ? preview.slice(0, 240) + "…" : preview}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-base-content/60">
                        <div className="text-center">
                          <div className="text-2xl mb-1">📄</div>
                          <div className="text-xs">No Preview</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="card-body p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="card-title text-base-content truncate flex-1 text-sm">{getTemplateTitle(tpl)}</h3>
                    </div>

                    <p className="text-xs text-base-content/70 mb-3 line-clamp-2 min-h-[2.5em]">
                      {getTemplateDescription(tpl)}
                    </p>

                    <div className="text-[10px] text-base-content/50 uppercase tracking-wider font-medium group-hover:hidden">
                      {formatRelativeTime(tpl?.createdAt || tpl?.created_at)}
                    </div>
                    <div className="text-[10px] text-base-content/50 uppercase tracking-wider font-medium hidden group-hover:block">
                      {formatDate(tpl?.createdAt || tpl?.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-base-content/70 text-lg mb-2">No templates found</p>
            <p className="text-base-content/50 text-sm">Templates created in your workspace will appear here.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
