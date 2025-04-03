"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOverridesSheet } from "@/hooks/use-overrides-sheet";
import { displayLanguageName } from "@/lib/format";
import { trpc } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "../ui/skeleton";
import { SubmitButton } from "../ui/submit-button";
import { Textarea } from "../ui/textarea";

const translationFormSchema = z.object({
  translations: z.array(
    z.object({
      id: z.string(),
      translatedText: z.string(),
      overridden: z.boolean().optional(),
    }),
  ),
});

type TranslationFormData = z.infer<typeof translationFormSchema>;

export function OverridesSheet() {
  const { translationKey, projectId, locale, setQueryStates } =
    useOverridesSheet();
  const t = useTranslations("overrides_sheet");

  const utils = trpc.useUtils();

  const { mutateAsync: updateTranslations, isPending } =
    trpc.translate.updateTranslations.useMutation({
      onSuccess: () => {
        utils.translate.invalidate();
        setQueryStates(null);
      },
    });

  const { data: translations, isLoading } =
    trpc.translate.getTranslationsByKey.useQuery(
      {
        projectId: projectId as string,
        translationKey: translationKey as string,
      },
      {
        enabled: Boolean(projectId && translationKey),
      },
    );

  const sortedTranslations = translations?.sort((a, b) => {
    if (a.targetLanguage === locale) return -1;
    if (b.targetLanguage === locale) return 1;

    return a.targetLanguage.localeCompare(b.targetLanguage);
  });

  const form = useForm<TranslationFormData>({
    resolver: zodResolver(translationFormSchema),
    defaultValues: {
      translations: [],
    },
  });

  useEffect(() => {
    if (sortedTranslations) {
      form.reset({
        translations: sortedTranslations.map((t) => ({
          id: t.id,
          translatedText: t.translatedText,
          overridden: t.overridden,
        })),
      });
    }
  }, [sortedTranslations, form]);

  const onSubmit = async (data: TranslationFormData) => {
    const updatedTranslations = data.translations.map((t, index) => ({
      ...t,
      overridden:
        form.getValues(`translations.${index}.translatedText`) !==
        sortedTranslations?.[index].translatedText,
    }));

    await updateTranslations({
      translations: updatedTranslations,
    });
  };

  return (
    <Sheet
      open={Boolean(translationKey)}
      onOpenChange={() => setQueryStates(null)}
    >
      <SheetContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto scrollbar-hide mt-6 pr-2">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(25)].map((_, i) => (
                  <Skeleton className="h-10 w-full" key={i.toString()} />
                ))}
              </div>
            ) : (
              <Accordion type="single" defaultValue={locale} collapsible>
                {sortedTranslations?.map((translation, index) => (
                  <AccordionItem
                    key={translation.id}
                    value={translation.targetLanguage}
                  >
                    <AccordionTrigger className="text-sm !no-underline">
                      <div className="flex items-center gap-2">
                        <span className="text-primary capitalize">
                          {displayLanguageName(translation.targetLanguage)}
                        </span>
                        <span className="text-secondary">
                          [{translation.targetLanguage}]
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Textarea
                        className="p-4 border-primary border border-dashed"
                        {...form.register(
                          `translations.${index}.translatedText`,
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          <div className="pt-6">
            <SubmitButton
              className="w-full"
              isSubmitting={isPending}
              disabled={!form.formState.isDirty}
            >
              {t("save")}
            </SubmitButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
