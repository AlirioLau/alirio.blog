(function( $, window, undefined ) {

  // $("#fade").click(function(){
  //   $("#sidebar,a#slide,#fade").removeClass("slide");
  //   $("#open").show();
  //   $("#search").show();
  //   $("#close").hide();
  // });

  // Search
  var bs = {
    close: $(".icon-remove-sign"),
    searchform: $(".search-form"),
    canvas: $("body"),
    dothis: $('.dosearch')
  };

  bs.dothis.on('click', function() {
    $('.search-wrapper').toggleClass('active');
    bs.searchform.toggleClass('active');
    bs.searchform.find('input').focus();
    bs.canvas.toggleClass('search-overlay');
    $('.search-field').simpleJekyllSearch();
  });

  function close_search() {
    $('.search-wrapper').toggleClass('active');
    bs.searchform.toggleClass('active');
    bs.canvas.removeClass('search-overlay');
  }

  bs.close.on('click', close_search);

  // Closing menu with ESC
  document.addEventListener('keyup', function(e){
      if(e.keyCode == 27 && $('.search-overlay').length) {
          close_search();
      }
  });
  
  if (document.getElementsByClassName('home').length >=1 ) {
      new AnimOnScroll( document.getElementById( 'grid' ), {
        minDuration : 0.4,
        maxDuration : 0.7,
        viewportFactor : 0.2
      } );
  }

function scrollBanner() {
  var scrollPos;
  var headerText = document.querySelector('.header-post .content')
  scrollPos = window.scrollY;

  if (scrollPos <= 500 && headerText != null) {
      headerText.style.transform =  "translateY(" + (-scrollPos/3) +"px" + ")";
      headerText.style.opacity = 1-(scrollPos/500);
  }
}

if (screen.width > 1024) {
  window.addEventListener('scroll', scrollBanner);
}

})( Zepto, window );
