import { memo } from "react";
import PreEmbedList from "./configurationComponent/PreEmbedList";
import InputConfigComponent from "./configurationComponent/InputConfigComponent";
import { useCustomSelector } from "@/customHooks/customSelector";

const InputSection = memo(
  ({
    params,
    searchParams,
    promptTextAreaRef,
    isEmbedUser,
    uiState,
    updateUiState,
    promptState,
    setPromptState,
    handleCloseTextAreaFocus,
    savePrompt,
    isMobileView,
    isPublished,
    isEditor,
  }) => {
    const { hidePreTool } = useCustomSelector((state) => ({
      hidePreTool: state.appInfoReducer.embedUserDetails.hidePreTool,
    }));

    return (
      <>
        {((!hidePreTool && isEmbedUser) || !isEmbedUser) && (
          <div
            data-testid="input-section-pre-embed-wrapper"
            id="input-section-pre-embed-wrapper"
            className="w-full cursor-default flex flex-wrap justify-between items-start gap-2"
          >
            <div className="flex-1">
              <PreEmbedList
                isPublished={isPublished}
                isEditor={isEditor}
                params={params}
                searchParams={searchParams}
                isEmbedUser={isEmbedUser}
              />
            </div>
          </div>
        )}
        <InputConfigComponent
          params={params}
          searchParams={searchParams}
          promptTextAreaRef={promptTextAreaRef}
          isEmbedUser={isEmbedUser}
          uiState={uiState}
          updateUiState={updateUiState}
          promptState={promptState}
          setPromptState={setPromptState}
          handleCloseTextAreaFocus={handleCloseTextAreaFocus}
          savePrompt={savePrompt}
          isMobileView={isMobileView}
          isPublished={isPublished}
          isEditor={isEditor}
        />
      </>
    );
  }
);

InputSection.displayName = "InputSection";

export default InputSection;
