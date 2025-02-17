$(document).ready(function () {
  var audioElement = document.createElement("audio");

  var songs = [
    {
      title: "Every 1s A Winner",
      src: "/Winner.mp3",
      albumCover: "./virginRecords.jpg",
    },
    {
      title: "Ox Out The Cage",
      src: "/Ox.mp3",
      albumCover: "./virginRecords.jpg",
    },
    {
      title: "Sickick",
      src: "https://raw.githubusercontent.com/abxlfazl/music-player-widget/main/src/assets/media/songs/1/song.mp3",
      albumCover: "./virginRecords.jpg",
    },
  ];

  var currentSongIndex = 0;

  function loadSong(songIndex) {
    var song = songs[songIndex];
    audioElement.setAttribute("src", song.src);
    $(".player__song").text(song.title);
    // Update the album cover if needed
    $(".player__album").css("background-image", "url(" + song.albumCover + ")");
  }

  // Initialize with the first song
  loadSong(currentSongIndex);

  $(".player__play").click(function () {
    if ($(".player").hasClass("play")) {
      $(".player").removeClass("play");
      audioElement.pause();
      $(".player__album").removeClass("rotating");
    } else {
      $(".player").addClass("play");
      audioElement.play();
      $(".player__album").addClass("rotating");
    }
  });

  $(".player__next").click(function () {
    nextSong();
  });

  $(".player__prev").click(function () {
    previousSong();
  });

  function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songs.length; // Loop to the first song if it's the last
    loadSong(currentSongIndex);
    audioElement.play();
    $(".player__album").addClass("rotating");
  }

  function previousSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length; // Loop to the last song if it's the first
    loadSong(currentSongIndex);
    audioElement.play();
    $(".player__album").addClass("rotating");
  }

  // Automatically play the next song when the current one ends
  audioElement.addEventListener("ended", function () {
    nextSong(); // Move to the next song when the current one finishes
  });

  audioElement.addEventListener("timeupdate", function () {
    var duration = this.duration;
    var currentTime = this.currentTime;
    var percentage = (currentTime / duration) * 100;
    $("#playhead").css("width", percentage + "%");
  });
});
