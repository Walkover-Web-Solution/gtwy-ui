"use client";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React, { useEffect } from "react";
import { CalendarIcon } from "@/components/Icons";
import { getCalApi } from "@calcom/embed-react";
import Modal from "../UI/Modal";
import { Play } from "lucide-react";

const DemoModal = ({ speakToUs }) => {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({
        namespace: "30min",
        embedLibUrl: process.env.NEXT_PUBLIC_ONE_HASH_CAL_EMBED_URL,
      });
      cal("ui", {
        hideEventTypeDetails: true,
        layout: "month_view",
      });
    })();
  }, []);

  const handleClose = () => {
    closeModal(MODAL_TYPE.DEMO_MODAL);
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.DEMO_MODAL}
      onClose={handleClose}
      title={speakToUs ? "Speak to Us" : "Discover GTWY AI"}
      description={speakToUs ? "Connect with our team for personalized guidance" : "See GTWY AI in action"}
      icon={<Play size={16} className="text-trace-gold" />}
      widthClass={speakToUs ? "w-[min(700px,92vw)]" : "w-[min(1300px,96vw)]"}
    >
      <div id="demo-modal-container" className="flex flex-col gap-6">
        {speakToUs ? (
          <div id="demo-modal-speak-to-us-content" className="p-6 bg-base-200/60">
            <p className="text-base-content mb-4">
              Discover how GTWY AI can transform your workflow. With our <strong>"Speak to Us"</strong> option, you'll:
            </p>
            <ul className="list-disc list-inside text-base-content space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Connect directly with our team for personalized guidance</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Explore use cases tailored to your business needs</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>See live demonstrations of GTWY AI in action</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Get expert advice on integration—no coding required</span>
              </li>
            </ul>
            <p className="text-base-content mt-4">
              Whether you're a developer, business leader, or exploring automation, our team is here to help you unlock
              the full potential of GTWY AI.
            </p>
          </div>
        ) : (
          <div
            id="demo-modal-video-content"
            className="relative group overflow-hidden border-2 border-base-content/10 shadow-xl hover:border-base-content/20 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
            <div className="aspect-video w-full overflow-hidden">
              <iframe
                data-testid="demo-modal-video-iframe"
                id="demo-modal-video-iframe"
                src="https://video-faq.viasocket.com/embed/cm60d6r5a031w121t2akjkw9y?embed_v=2"
                loading="lazy"
                title="AI-middleware"
                className="w-full h-full transition-transform duration-300"
                frameBorder="0"
                mozallowfullscreen="true"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-2">
          <button
            data-testid="demo-modal-schedule-button"
            id="demo-modal-schedule-button"
            data-cal-namespace="30min"
            data-cal-link={speakToUs ? "human-gtwy-ai/book-a-demo-with-gtwy" : "team/gtwy.ai/30min"}
            data-cal-origin="https://cal.id"
            data-cal-config='{"layout":"month_view"}'
            onClick={() => handleClose()}
            className="btn btn-primary px-8 py-3 text-lg font-semibold transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Schedule Personalized Demo</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DemoModal;
