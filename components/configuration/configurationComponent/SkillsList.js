import { useCustomSelector } from "@/customHooks/customSelector";
import { AddIcon, TrashIcon, SettingsIcon } from "@/components/Icons";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { getAllSkills, createSkillAction, updateSkillAction } from "@/store/action/skillsAction";
import { openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import SkillCreateModal from "@/components/skills/SkillCreateModal";
import { truncate } from "@/components/historyPageComponents/AssistFile";
import InfoTooltip from "@/components/InfoTooltip";
import DeleteModal from "@/components/UI/DeleteModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { CircleQuestionMark, BookOpen } from "lucide-react";

const SkillsList = ({ params, searchParams, isPublished, isEditor = true }) => {
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();

  const { skillsVersionData, currentUser, skillsData } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    const connectedTools = isPublished ? bridgeDataFromState?.connected_tools : versionData?.connected_tools;

    const skillsVersionData = (Array.isArray(connectedTools) ? connectedTools : [])
      .filter((item) => item?.type === "skills")
      .map((item) => item?.id);

    return {
      skillsVersionData,
      currentUser: state?.userDetailsReducer?.userDetails || {},
      skillsData: state?.bridgeReducer?.org?.[params?.org_id]?.skillsData || {},
    };
  });

  const [editingSkill, setEditingSkill] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [skillNameToDelete, setSkillNameToDelete] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_SKILL_MODAL);

  useEffect(() => {
    // Fetch skills from Redux if not already loaded
    if (params?.org_id && (!skillsData || Object.keys(skillsData).length === 0)) {
      dispatch(getAllSkills(params?.org_id));
    }
  }, [params?.org_id, dispatch]);

  const handleOpenEditModal = (skillId) => {
    const skill = skillsData?.[skillId];
    if (skill) {
      setEditingSkill(skill);
      openModal(MODAL_TYPE.CREATE_SKILL_MODAL);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSkill(null);
    openModal(MODAL_TYPE.CREATE_SKILL_MODAL);
  };

  const handleAddSkill = (skillId) => {
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: {
          connected_tools: {
            type: "skills",
            id: skillId,
          },
          connected_tools_operation: 1,
        },
      })
    );

    // Close dropdown after selection
    setTimeout(() => {
      if (typeof document !== "undefined") {
        document.activeElement?.blur?.();
      }
    }, 0);
  };

  const handleOpenDeleteModal = (skillId, skillName) => {
    setSkillToDelete(skillId);
    setSkillNameToDelete(skillName);
    openModal(MODAL_TYPE.DELETE_SKILL_MODAL);
  };

  const handleDeleteSkill = async () => {
    await executeDelete(async () => {
      return dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            connected_tools: {
              type: "skills",
              id: skillToDelete,
            },
            connected_tools_operation: 0,
          },
        })
      );
    });
  };

  const handleCreateSuccess = async (formData) => {
    try {
      let result;

      if (editingSkill) {
        // Update existing skill
        result = await dispatch(
          updateSkillAction({
            skillId: editingSkill._id,
            orgId: params?.org_id,
            dataToSend: formData,
          })
        );
      } else {
        // Create new skill
        result = await dispatch(createSkillAction(formData));

        // Automatically connect the newly created skill to the current version
        if (result.success) {
          const newSkill = result.data;
          dispatch(
            updateBridgeVersionAction({
              bridgeId: params.id,
              versionId: searchParams?.version,
              dataToSend: {
                connected_tools: {
                  type: "skills",
                  id: newSkill._id,
                },
                connected_tools_operation: 1,
              },
            })
          );
        }
      }
    } catch (error) {
      console.error("Error in handleCreateSuccess:", error);
      throw error;
    }
  };

  const hasSkills = (Array.isArray(skillsVersionData) ? skillsVersionData : []).length > 0;

  // Convert skillsData object to array for rendering
  const skillsArray = useMemo(() => {
    return Object.values(skillsData || {});
  }, [skillsData]);

  const skillsDropdownContent = (
    <ul
      data-testid="skills-dropdown"
      id="skills-dropdown"
      tabIndex={0}
      className="menu menu-dropdown-toggle dropdown-content z-high px-4 shadow bg-base-100 rounded-box w-72 max-h-96 overflow-y-auto pb-1"
    >
      <div className="flex flex-col gap-2 w-full">
        <li className="text-sm font-semibold disabled">Available Skills</li>
        <input
          autoComplete="off"
          data-testid="skills-search-input"
          id="skills-search-input"
          type="text"
          placeholder="Search Skills"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered w-full input-sm"
        />
        {(Array.isArray(skillsArray) ? skillsArray : [])
          .filter((item) => {
            const matchesSearch =
              item?.name?.toLowerCase()?.includes(normalizedSearchQuery) ||
              item?.description?.toLowerCase()?.includes(normalizedSearchQuery);
            const alreadyExists = skillsVersionData?.some((skillItem) => skillItem === item?._id);
            return matchesSearch && !alreadyExists;
          })
          .map((item) => (
            <li
              data-testid={`skills-dropdown-item-${item?._id}`}
              id={`skills-dropdown-item-${item?._id}`}
              key={item?._id}
              onClick={() => handleAddSkill(item?._id)}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-primary" />
                  {item?.name?.length > 20 ? (
                    <div className="tooltip" data-tip={item?.name}>
                      {truncate(item?.name, 20)}
                    </div>
                  ) : (
                    truncate(item?.name, 20)
                  )}
                </div>
              </div>
            </li>
          ))}
        <li
          data-testid="skills-add-new-button"
          id="skills-add-new-button"
          className="py-2 border-t border-base-300 w-full sticky bottom-0 bg-base-100"
          onClick={() => {
            handleOpenCreateModal();
            if (typeof document !== "undefined") {
              document.activeElement?.blur?.();
            }
          }}
        >
          <div>
            <AddIcon size={16} />
            <p className="font-semibold">Create New Skill</p>
          </div>
        </li>
      </div>
    </ul>
  );

  const renderSkills = useMemo(() => {
    return (Array.isArray(skillsVersionData) ? skillsVersionData : [])
      ?.map((skillId, index) => {
        const item = skillsData?.[skillId];
        return item ? (
          <div
            data-testid={`skill-card-${item._id}`}
            id={`skill-card-${item._id}`}
            key={skillId || index}
            className={`group flex items-center border border-base-200 bg-base-100 relative min-h-[44px] w-full transition-colors duration-200 ${isReadOnly ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-2 w-full ml-2">
              <BookOpen size={16} className="text-primary" />
              <div className="flex items-center gap-2 w-full">
                {item?.name?.length > 24 ? (
                  <div className="tooltip tooltip-top min-w-0" data-tip={item?.name}>
                    <span className="min-w-0 text-sm truncate text-left">
                      <span className="truncate text-sm font-normal block w-[300px]">{item?.name}</span>
                    </span>
                  </div>
                ) : (
                  <span className="min-w-0 text-sm truncate text-left">
                    <span className="truncate text-sm font-normal block w-[300px]">{item?.name}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons that appear on hover */}
            {!isReadOnly && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 pr-2 flex-shrink-0">
                <button
                  data-testid={`skill-config-button-${item._id}`}
                  id={`skill-config-button-${item._id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(skillId);
                  }}
                  className="btn btn-ghost btn-sm p-1 hover:bg-base-300"
                  title="Edit Skill"
                  disabled={isReadOnly}
                >
                  <SettingsIcon size={16} />
                </button>
                <button
                  data-testid={`skill-delete-button-${item._id}`}
                  id={`skill-delete-button-${item._id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeleteModal(skillId, item?.name);
                  }}
                  className="btn btn-ghost btn-sm p-1 hover:bg-red-100 hover:text-error"
                  title="Remove"
                  disabled={isReadOnly}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            )}
          </div>
        ) : null;
      })
      .filter(Boolean);
  }, [skillsVersionData, skillsData, isReadOnly]);

  return (
    <div className="w-full gap-2 flex flex-col px-2 py-2 cursor-default">
      <DeleteModal
        onConfirm={handleDeleteSkill}
        item={skillToDelete}
        name={skillNameToDelete}
        title="Are you sure?"
        description={"This action will remove the selected Skill from the Agent."}
        buttonTitle="Remove Skill"
        modalType={MODAL_TYPE.DELETE_SKILL_MODAL}
        loading={isDeleting}
        isAsync={true}
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm whitespace-nowrap">Skills</p>
          <InfoTooltip tooltipContent="Skills are reusable capabilities that can be connected to agents to enhance their functionality and performance.">
            <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-2 w-full max-w-md">
          {!hasSkills ? (
            <div
              data-testid="skills-no-skills-dropdown"
              id="skills-no-skills-dropdown"
              className="dropdown dropdown-end w-full"
            >
              <div className="border-2 border-base-200 border-dashed p-4 text-center">
                <p className="text-sm text-base-content/70">No skills found.</p>
                {!isReadOnly && (
                  <button
                    data-testid="skills-add-skill-button-empty"
                    id="skills-add-skill-button"
                    tabIndex={0}
                    className="flex items-center justify-center gap-1 mt-3 text-base-content hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                    disabled={isReadOnly}
                    onClick={() => {
                      setTimeout(() => {
                        document.getElementById("skills-search-input")?.focus();
                      }, 50);
                    }}
                  >
                    <AddIcon className="w-3 h-3" />
                    Add
                  </button>
                )}
              </div>
              {!isReadOnly && skillsDropdownContent}
            </div>
          ) : (
            <>
              {renderSkills}
              {!isReadOnly && (
                <div
                  data-testid="skills-add-skill-dropdown"
                  id="skills-add-skill-dropdown"
                  className="dropdown dropdown-end w-full"
                >
                  <div className="border-2 border-base-200 border-dashed text-center">
                    <button
                      data-testid="skills-add-skill-button"
                      id="skills-add-skill-button"
                      tabIndex={0}
                      className="flex items-center justify-center gap-1 p-2 text-base-content/50 hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                      disabled={isReadOnly}
                      onClick={() => {
                        setTimeout(() => {
                          document.getElementById("skills-search-input")?.focus();
                        }, 50);
                      }}
                    >
                      <AddIcon className="w-3 h-3" />
                      Add Skill
                    </button>
                  </div>
                  {skillsDropdownContent}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Skill Modal */}
      <SkillCreateModal
        onSuccess={handleCreateSuccess}
        orgId={params?.org_id}
        userId={currentUser?.id}
        editingSkill={editingSkill}
      />
    </div>
  );
};

export default SkillsList;
