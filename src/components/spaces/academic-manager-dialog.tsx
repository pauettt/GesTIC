"use client";

import { useState } from "react";
import { GraduationCapIcon } from "lucide-react";

import { deleteAcademicEntry, reorderAcademicEntry, upsertAcademicEntry } from "@/actions/academic-structure";
import { CategoryManagerList, type ManagedCategory, type ManagerLabels } from "@/components/shared/category-manager-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ManagedAcademicStage = ManagedCategory & {
  courses: (ManagedCategory & { groups: ManagedCategory[] })[];
};

const LABELS: Record<"stage" | "course" | "group", ManagerLabels> = {
  stage: { created: "Etapa creada", updated: "Etapa actualitzada", deleted: "Etapa eliminada", empty: "Encara no hi ha cap etapa.", newPlaceholder: "Nova etapa (p. ex. ESO)" },
  course: { created: "Curs creat", updated: "Curs actualitzat", deleted: "Curs eliminat", empty: "Aquesta etapa encara no té cursos.", newPlaceholder: "Nou curs (p. ex. 2n)" },
  group: { created: "Grup creat", updated: "Grup actualitzat", deleted: "Grup eliminat", empty: "Aquest curs encara no té grups.", newPlaceholder: "Nou grup (p. ex. B)" },
};

function EntryList({ kind, parentId, items }: {
  kind: "stage" | "course" | "group";
  parentId?: string;
  items: ManagedCategory[];
}) {
  const nouns = { stage: ["curs", "cursos"], course: ["grup", "grups"], group: ["sol·licitud", "sol·licituds"] }[kind];
  return (
    <CategoryManagerList
      categories={items}
      upsertAction={(input) => upsertAcademicEntry({ ...input, kind, parentId })}
      deleteAction={(input) => deleteAcademicEntry({ ...input, kind })}
      reorderAction={(input) => reorderAcademicEntry({ ...input, kind })}
      itemNounSingular={nouns[0]}
      itemNounPlural={nouns[1]}
      labels={LABELS[kind]}
    />
  );
}

function ParentSelect({ id, label, value, options, onChange }: {
  id: string;
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={(next) => next && onChange(next)} items={Object.fromEntries(options.map((option) => [option.id, option.name]))}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function AcademicManagerDialog({ stages }: { stages: ManagedAcademicStage[] }) {
  const [stageId, setStageId] = useState("");
  const [courseId, setCourseId] = useState("");
  const stage = stages.find((item) => item.id === stageId) ?? stages[0];
  const course = stage?.courses.find((item) => item.id === courseId) ?? stage?.courses[0];

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm"><GraduationCapIcon className="size-4" />Etapes, cursos i grups</Button>} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Etapes, cursos i grups</DialogTitle>
          <DialogDescription>
            Les opcions que es poden triar en demanar un Chromebook per a l&apos;alumnat. Crea primer les etapes, després els seus cursos i finalment els grups de cada curs.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="stages">
          <TabsList aria-label="Organització acadèmica" className="w-full">
            <TabsTrigger value="stages">Etapes</TabsTrigger>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="groups">Grups</TabsTrigger>
          </TabsList>
          <TabsContent value="stages" className="mt-3 flex flex-col gap-4">
            <EntryList kind="stage" items={stages} />
          </TabsContent>
          <TabsContent value="courses" className="mt-3 flex flex-col gap-4">
            {!stage ? <p>Crea primer una etapa a la pestanya «Etapes».</p> : <>
              <ParentSelect id="academic-course-stage" label="Etapa" value={stage.id} options={stages} onChange={(id) => { setStageId(id); setCourseId(""); }} />
              <EntryList key={stage.id} kind="course" parentId={stage.id} items={stage.courses} />
            </>}
          </TabsContent>
          <TabsContent value="groups" className="mt-3 flex flex-col gap-4">
            {!stage ? <p>Crea primer una etapa a la pestanya «Etapes».</p> : <>
              <ParentSelect id="academic-group-stage" label="Etapa" value={stage.id} options={stages} onChange={(id) => { setStageId(id); setCourseId(""); }} />
              {!course ? <p>Crea primer un curs per a aquesta etapa a la pestanya «Cursos».</p> : <>
                <ParentSelect id="academic-group-course" label="Curs" value={course.id} options={stage.courses} onChange={setCourseId} />
                <EntryList key={course.id} kind="group" parentId={course.id} items={course.groups} />
              </>}
            </>}
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground">No es poden eliminar etapes amb cursos, cursos amb grups ni grups amb sol·licituds.</p>
      </DialogContent>
    </Dialog>
  );
}
