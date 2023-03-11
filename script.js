const demosSection = document.getElementById('demos');

var tfModel = undefined;

cocoSsd.load().then(function (loadedModel) {
    tfModel = loadedModel;
    demosSection.classList.remove('invisible');
});

const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
// const cvs = document.getElementById('cvs');
const cnt = document.getElementById('cnt');

function hasGetUserMedia() {
    return !!(navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia);
}

var children = [];

if (hasGetUserMedia()) {
    const enableWebcamButton = document.getElementById('webcamButton');
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

function enableCam(event) {
    if (!tfModel) {
        console.log('Wait! Model not loaded yet.')
        return;
    }

    event.target.classList.add('removed');

    // const constraints = {
    //     audio: true
    //     video: true
    // };

    const constraints = {
        video: {
            width: 1280, // 1920,
            height: 720, // 1080,
            frameRate: {
                ideal: 4, // 15
                max: 30
            }
        }
    };

    document.getElementById('percent').style.paddingTop = constraints.video.height + 100 + "px"

    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
    });
}

let prediction;

function predictWebcam() {
    tfModel.detect(video).then(function (predictions) {
        for (let i = 0; i < children.length; i++) {
            liveView.removeChild(children[i]);
        }
        children.splice(0);

        const pp = document.createElement('p');
        pp.setAttribute('class', 'datetime');
        let d = new Date();
        pp.innerText = d.toLocaleTimeString().split(' ')[0]+'.'+d.getMilliseconds();
        pp.style = 'left: 0px;' + 'top: 0px;';
        liveView.appendChild(pp);
        children.push(pp);
        num_obj = 0
        cnt.innerText = ''
        // cvs.innerText = ''

        for (let n = 0; n < predictions.length; n++) {
            if (predictions[n].score > 0.60 && predictions[n].class == 'tv') { // 'person' 'tv' // https://tech.amikelive.com/node-718/what-object-categories-labels-are-in-coco-dataset/
                num_obj += 1
                // console.log(predictions[n].class)
                const p = document.createElement('p');
                p.innerText = num_obj + ' - ' + Math.round(parseFloat(predictions[n].score) * 100) + '% confidence.';
                p.style = 'left: ' + predictions[n].bbox[0] + 'px;' +
                    'top: ' + predictions[n].bbox[1] + 'px;' +
                    'width: ' + (predictions[n].bbox[2] - 10) + 'px;';

                const highlighter = document.createElement('div');
                highlighter.setAttribute('class', 'highlighter');
                highlighter.style = 'left: '
                    + predictions[n].bbox[0] + 'px; top: '
                    + predictions[n].bbox[1] + 'px; width: '
                    + predictions[n].bbox[2] + 'px; height: '
                    + predictions[n].bbox[3] + 'px;';

                liveView.appendChild(highlighter);
                liveView.appendChild(p);

                prediction = predictions[n];
                displayCanvas(prediction, num_obj);

                children.push(highlighter);
                children.push(p);
            } else {
                // cnt.innerText = ''
            }
        }
        window.requestAnimationFrame(predictWebcam);
    });
}

function displayCanvas(prediction, num_obj) {
    let canvas = document.createElement("canvas");
    // let canvas = document.getElementById("c");
    canvas.width = Math.floor(prediction.bbox[2]);
    canvas.height = Math.floor(prediction.bbox[3]);
    let ctx = canvas.getContext(
        "2d", 
        { 
            willReadFrequently: true 
        }
    ); // Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true warnings
    ctx.drawImage(
        video,
        Math.floor(prediction.bbox[0]), // sx
        Math.floor(prediction.bbox[1]), // sy
        Math.floor(prediction.bbox[2]), // sWidth
        Math.floor(prediction.bbox[3]), // sHeight
        0, // dx
        0, // dy
        Math.floor(prediction.bbox[2]), // dWidth
        Math.floor(prediction.bbox[3]), // dHeight
    );
    /*
    drawImage(image, dx, dy)
    drawImage(image, dx, dy, dWidth, dHeight)
    drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    */
    let frame = ctx.getImageData(
        0,
        0,
        Math.floor(prediction.bbox[2]),
        Math.floor(prediction.bbox[3])
    );
    let l = frame.data.length / 4;
    let num = l; // r|g|b|a
    for (let i = 0; i < l; i++) {
        let r = frame.data[i * 4 + 0];
        let g = frame.data[i * 4 + 1];
        let b = frame.data[i * 4 + 2];
        if (r <= 63 && g <= 63 && b <= 63) { // (r <= 127 && g <= 127 && b <= 127): darker than gray, no lighter r/g/b
        // if (r <= 63) {
            // frame.data[i * 4 + 3] = 0; // opacity = zero
            num -= 1;
        }
    }
    // ctx.putImageData(frame, 0, 0);
    // cvs.append(canvas);
    cnt.innerText += '\n' + num_obj + '\n' + (num) + '/' + l + '(' + Math.round((num)/l*1000)/10 +' %)';
}
