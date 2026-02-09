"use client";
import React, { use, useState } from "react";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import AddNewModelModal from "@/components/modals/AddNewModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import MainLayout from "@/components/layoutComponents/MainLayout";
import CustomTable from "@/components/customTable/CustomTable";
import PageHeader from "@/components/Pageheader";
import { TrashIcon } from "@/components/Icons";
import { deleteModelAction } from "@/store/action/modelAction";
import { useDispatch } from "react-redux";
import ModelUsageDetailsModal from "@/components/modals/ModelUsageDetailsModal";
import DeleteModal from "@/components/UI/DeleteModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

export const runtime = "edge";

const Page = ({ params }) => {
  const resolvedParams = use(params);
  const dispatch = useDispatch();
  const [usageDetailsData, setUsageDetailsData] = useState();
  const [selectedDataToDelete, setselectedDataToDelete] = useState();
  const { isDeleting, executeDelete } = useDeleteOperation();
  const { modelInfo } = useCustomSelector((state) => ({
    modelInfo: state?.modelReducer?.serviceModels,
  }));

  const findModelsWithOrgId = (data, parentKey = null, rootKey = null, results = []) => {
    if (typeof data !== "object" || data === null) return results;

    if (data.org_id) {
      results.push({ ...data, key: parentKey, service: rootKey });
      return results;
    }

    for (const key in data) {
      findModelsWithOrgId(
        data[key],
        key,
        rootKey || key, // Only set rootKey if it's not already set
        results
      );
    }

    return results;
  };

  const getModelsWithOrgId = () => {
    if (!modelInfo) return [];
    return findModelsWithOrgId(modelInfo);
  };

  const modelWithOrgId = getModelsWithOrgId();

  const tableData = modelWithOrgId.map((model) => ({
    model: model?.key,
    type: model?.validationConfig?.type,
    input_cost: model?.validationConfig?.specification?.input_cost,
    output_cost: model?.validationConfig?.specification?.output_cost,
    description: model?.validationConfig?.specification?.description,
    knowledge_cutoff: model?.validationConfig?.specification?.knowledge_cutoff,
    service: model?.service,
  }));

  const columnsToShow = ["model", "service", "type", "description", "knowledge_cutoff", "input_cost", "output_cost"];

  const handleDeleteModel = async () => {
    const dataToSend = {
      model_name: selectedDataToDelete.model,
      service: selectedDataToDelete.service,
      type: selectedDataToDelete.type,
    };

    // Use executeDelete to handle loading state and modal closing
    const result = await executeDelete(async () => {
      return dispatch(deleteModelAction(dataToSend));
    });

    // Handle specific error cases after the modal is closed
    if (!result.success && result.error?.response?.data?.usageDetails) {
      setUsageDetailsData(result.error.response.data.usageDetails);
      openModal(MODAL_TYPE.USAGE_DETAILS_MODAL);
    }
  };

  const EndComponent = ({ row }) => {
    return (
      <div className="flex gap-3 justify-center items-center">
        <div
          className="tooltip tooltip-primary"
          data-tip="Delete"
          onClick={() => {
            setselectedDataToDelete(row);
            openModal(MODAL_TYPE?.DELETE_MODAL);
          }}
        >
          <TrashIcon strokeWidth={2} size={20} />
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="px-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full mb-4 px-2 pt-4">
          <PageHeader
            title="Model Management"
            description="Add and configure AI models for different services and use cases."
          />
          <div className="flex-shrink-0 mt-4 sm:mt-0">
            <button onClick={() => openModal(MODAL_TYPE.ADD_NEW_MODEL_MODAL)} className="btn btn-sm btn-primary">
              + Add New Model
            </button>
          </div>
        </div>

        <CustomTable data={tableData} columnsToShow={columnsToShow} endComponent={EndComponent} />
        <AddNewModelModal />
        <ModelUsageDetailsModal usageDetailsData={usageDetailsData} params={resolvedParams} />
        <DeleteModal
          onConfirm={handleDeleteModel}
          item={selectedDataToDelete}
          description={`Are you sure you want to delete the Model "${selectedDataToDelete?.model}"? This action cannot be undone.`}
          title="Delete Model"
          loading={isDeleting}
          isAsync={true}
        />
      </div>
    </MainLayout>
  );
};

export default Page;
