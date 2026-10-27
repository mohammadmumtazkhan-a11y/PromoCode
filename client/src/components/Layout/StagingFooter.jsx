import React from 'react';

const StagingFooter = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="staging-footer">
      <div>
        &copy; {currentYear}. Mito.money is a trademark owned by Funtech Global Communications Ltd. Devonshire House, Manor way, Borehamwood, Herts. WD6 1QQ, United Kingdom. A registered Payment institution in the UK with registration details FRN: 815146 MLR NO: 12803115.
      </div>
    </footer>
  );
};

export default StagingFooter;
