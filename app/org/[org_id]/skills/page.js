"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "next/navigation";
import { Lock, ScrollText } from "lucide-react";

import MainLayout from "@/components/layoutComponents/MainLayout";
import PageHeader from "@/components/Pageheader";
import CustomTable from "@/components/customTable/CustomTable";
import SearchItems from "@/components/UI/SearchItems";
import DeleteModal from "@/components/UI/DeleteModal";
import SkillCreateModal from "@/components/skills/SkillCreateModal";
import { SquarePenIcon, TrashIcon } from "@/components/Icons";
import { useCustomSelector } from "@/customHooks/customSelector";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { createSkillAction, deleteSkillAction, getAllSkills, updateSkillAction } from "@/store/action/skillsAction";
import { MODAL_TYPE } from "@/utils/enums";
import { formatRelativeTime, openModal } from "@/utils/utility";

export const runtime = "edge";

const COLUMNS_TO_SHOW = ["name", "description", "updated"];

const getColumnLabel = (column) => {
  switch (column) {
    case "name":
      return "Skill Name";
    case "description":
      return "Description";
    case "updated":
      return "Last Updated";
    default:
      return column;
  }
};

const SkillsPage = () => {
  const params = useParams();
  const orgId = params?.org_id;
  const dispatch = useDispatch();

  const { skillsData, orgRole, currentUser } = useCustomSelector((state) => ({
    skillsData: state?.bridgeReducer?.org?.[orgId]?.skillsData || {},
    orgRole: state?.userDetailsReducer?.organizations?.[orgId]?.role_name || "Viewer",
    currentUser: state?.userDetailsReducer?.userDetails || {},
  }));

  const [editingSkill, setEditingSkill] = useState(null);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [filteredSkills, setFilteredSkills] = useState(null);
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_SKILL_MODAL);

  useEffect(() => {
    if (orgId) dispatch(getAllSkills(orgId));
  }, [orgId, dispatch]);

  const skills = useMemo(() => Object.values(skillsData || {}), [skillsData]);
  const visibleSkills = filteredSkills ?? skills;

  // Flatten to the displayed columns; _skill keeps the full record for the modals.
  const rows = useMemo(
    () =>
      visibleSkills.map((skill) => ({
        name: skill?.name || "",
        description: skill?.description || "",
        updated: skill?.updatedAt ? formatRelativeTime(skill.updatedAt) : "-",
        _skill: skill,
      })),
    [visibleSkills]
  );

  const handleOpenCreate = useCallback(() => {
    setEditingSkill(null);
    openModal(MODAL_TYPE.CREATE_SKILL_MODAL);
  }, []);

  const handleOpenEdit = useCallback((skill) => {
    setEditingSkill(skill);
    openModal(MODAL_TYPE.CREATE_SKILL_MODAL);
  }, []);

  const handleOpenDelete = useCallback((skill) => {
    setSkillToDelete(skill);
    openModal(MODAL_TYPE.DELETE_SKILL_MODAL);
  }, []);

  // Refused server-side if any agent still uses it; detaching is done on the Connectors tab.
  const handleDelete = useCallback(async () => {
    if (!skillToDelete?._id) return;
    await executeDelete(async () => dispatch(deleteSkillAction({ skillId: skillToDelete._id, orgId })));
  }, [dispatch, executeDelete, orgId, skillToDelete]);

  const handleSaveSkill = useCallback(
    async (formData) => {
      if (editingSkill) {
        await dispatch(updateSkillAction({ skillId: editingSkill._id, orgId, dataToSend: formData }));
      } else {
        await dispatch(createSkillAction(formData));
      }
    },
    [dispatch, editingSkill, orgId]
  );

  const EndComponent = useCallback(
    ({ row }) => (
      <div className="flex gap-3 justify-center items-center">
        <div className="tooltip tooltip-primary" data-tip="Edit" onClick={() => handleOpenEdit(row?._skill)}>
          <SquarePenIcon size={20} className="cursor-pointer hover:text-primary transition-colors" />
        </div>
        <div className="tooltip tooltip-primary" data-tip="Delete" onClick={() => handleOpenDelete(row?._skill)}>
          <TrashIcon strokeWidth={2} size={20} className="cursor-pointer hover:text-error transition-colors" />
        </div>
      </div>
    ),
    [handleOpenEdit, handleOpenDelete]
  );

  if (orgRole === "Viewer")
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Lock size={48} className="text-error mb-4" />
          <h2 className="text-xl font-bold text-center">Access Restricted</h2>
          <p className="text-center mt-2">This page is locked for viewers</p>
        </div>
      </div>
    );

  return (
    <div data-testid="skills-page-container" id="skills-page-container" className="w-full">
      <MainLayout>
        <PageHeader
          title="Skills"
          description="Skills are reusable sets of instructions an agent loads only when they are relevant — a refund policy, an escalation procedure, a writing style. Attach them to an agent from its Connectors tab."
        />
      </MainLayout>

      <div className="flex flex-row flex-wrap gap-4 px-4 pb-3 items-center">
        {skills.length > 5 && <SearchItems data={skills} setFilterItems={setFilteredSkills} item="Skills" />}
        <div className={`flex-shrink-0 ${skills.length > 5 ? "mr-2" : "ml-2"}`}>
          <button data-testid="skills-page-create-button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
            Create Skill
          </button>
        </div>
      </div>

      <div className="px-4 pb-6">
        {rows.length > 0 ? (
          <CustomTable
            data={rows}
            columnsToShow={COLUMNS_TO_SHOW}
            customGetColumnLabel={getColumnLabel}
            keysToWrap={["description"]}
            endComponent={EndComponent}
          />
        ) : (
          <div className="border-2 border-base-200 border-dashed p-10 text-center">
            <ScrollText size={32} className="mx-auto mb-3 text-base-content/40" />
            <p className="text-base-content/70">No skills yet.</p>
            <p className="text-sm text-base-content/50 mt-1">
              Create one to give your agents instructions they can pull in on demand.
            </p>
          </div>
        )}
      </div>

      <SkillCreateModal
        onSuccess={handleSaveSkill}
        orgId={orgId}
        userId={currentUser?.id}
        editingSkill={editingSkill}
      />

      <DeleteModal
        onConfirm={handleDelete}
        item={skillToDelete}
        name={skillToDelete?.name}
        title="Delete skill"
        description="This permanently deletes the skill and cannot be undone. A skill still attached to an agent cannot be deleted - detach it there first."
        buttonTitle="Delete Skill"
        modalType={MODAL_TYPE.DELETE_SKILL_MODAL}
        loading={isDeleting}
        isAsync={true}
      />
    </div>
  );
};

export default SkillsPage;
