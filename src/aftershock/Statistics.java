package aftershock;

/** Explicit, finite-sample time-series statistics. No inference or forecasts. */
public final class Statistics {
    private Statistics() {}
    public static double[] returns(double[] prices) {
        if(prices.length<3)throw new IllegalArgumentException("At least three prices required");
        for(double p:prices)if(!Double.isFinite(p)||p<=0)throw new IllegalArgumentException("Positive finite prices required");
        double[] r=new double[prices.length-1];
        for(int i=1;i<prices.length;i++)r[i-1]=Math.log(prices[i])-Math.log(prices[i-1]);
        return r;
    }
    public static double[] transform(double[] x,String mode) {
        if(!mode.equals("signed")&&!mode.equals("absolute")&&!mode.equals("squared"))throw new IllegalArgumentException("Unknown transformation");
        double[] y=new double[x.length];
        for(int i=0;i<x.length;i++){
            if(!Double.isFinite(x[i]))throw new IllegalArgumentException("Finite samples required");
            y[i]=mode.equals("absolute")?Math.abs(x[i]):mode.equals("squared")?x[i]*x[i]:x[i];
            if(!Double.isFinite(y[i]))throw new IllegalArgumentException("Transformation overflow");
        }
        return y;
    }
    /** Biased ACF: one global mean, denominator sum over all N centered squares. */
    public static double[] acf(double[] x,int maxLag) {
        if(x.length<2||maxLag<1||maxLag>=x.length)throw new IllegalArgumentException("Lag must be between 1 and N-1");
        double mean=0,scale=0;for(double v:x){if(!Double.isFinite(v))throw new IllegalArgumentException("Finite samples required");scale=Math.max(scale,Math.abs(v));}
        double[] out=new double[maxLag+1];
        // Normalize before summation to avoid overflow and preserve scale invariance.
        if(scale==0){java.util.Arrays.fill(out,Double.NaN);return out;}
        for(double v:x)mean+=v/scale/x.length;
        double[] c=new double[x.length];double denominator=0;
        for(int i=0;i<x.length;i++){c[i]=x[i]/scale-mean;denominator+=c[i]*c[i];}
        if(denominator<1e-28){java.util.Arrays.fill(out,Double.NaN);return out;}
        out[0]=1;
        for(int lag=1;lag<=maxLag;lag++){double sum=0;for(int i=lag;i<x.length;i++)sum+=c[i]*c[i-lag];out[lag]=sum/denominator;}
        return out;
    }
    public static final class Random {
        private int state;
        public Random(int seed){state=seed;}
        public double next(){state=1664525*state+1013904223;return Integer.toUnsignedLong(state)/4294967296.0;}
        public double gaussian(){return Math.sqrt(-2*Math.log(Math.max(next(),1.0/4294967296.0)))*Math.cos(2*Math.PI*next());}
    }
    public static double[] shuffle(double[] x,int seed) {
        double[] y=x.clone();var r=new Random(seed);
        for(int i=y.length-1;i>0;i--){int j=(int)Math.floor(r.next()*(i+1));double tmp=y[i];y[i]=y[j];y[j]=tmp;}
        return y;
    }
    /** Trailing root-mean-square returns, no demeaning or annualization. */
    public static double[] rms(double[] x,int window) {
        if(window<1||window>x.length)throw new IllegalArgumentException("Invalid RMS window");
        double[] out=new double[x.length];java.util.Arrays.fill(out,Double.NaN);
        for(int i=window-1;i<x.length;i++){double s=0;for(int j=i-window+1;j<=i;j++)s+=x[j]*x[j];out[i]=Math.sqrt(s/window);}
        return out;
    }
    public static double[] garch(int n,int seed) {
        if(n<2||n>10000)throw new IllegalArgumentException("Synthetic size between 2 and 10000 required");
        var r=new Random(seed);double[] out=new double[n];double variance=.0001,previous=0;
        for(int i=-1000;i<n;i++){variance=.000004+.12*previous*previous+.84*variance;previous=Math.sqrt(variance)*r.gaussian();if(i>=0)out[i]=previous;}
        return out;
    }
}
