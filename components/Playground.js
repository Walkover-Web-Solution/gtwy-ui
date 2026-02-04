"use client ";
const Playground = () => {
  return (
    <div>
      <div id="playground-card" className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Card title!</h2>
          <p>If a dog chews shoes whose shoes does he choose?</p>
          <div className="card-actions justify-end">
            <button id="playground-buy-button" className="btn btn-primary btn-sm">
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
